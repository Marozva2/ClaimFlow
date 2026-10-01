from datetime import date
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import AuditLog, Claim, Policy, db
from routes.authz import current_user, is_staff, roles_required
from serializers import ClaimSchema
from sqlalchemy.exc import SQLAlchemyError

claims_bp = Blueprint("claims_bp", __name__)
api = Api(claims_bp)

claim_schema = ClaimSchema()
claims_schema = ClaimSchema(many=True)

claim_post_parser = reqparse.RequestParser()
claim_post_parser.add_argument("policy_id", type=int, required=True)
claim_post_parser.add_argument("description", type=str, required=True)
claim_post_parser.add_argument("amount_claimed", type=float, required=True)

transition_parser = reqparse.RequestParser()
transition_parser.add_argument("status", type=str, required=True)
transition_parser.add_argument("amount_approved", type=float)

TRANSITIONS = {
    "submitted": {"under_review"},
    "under_review": {"awaiting_information", "approved", "rejected"},
    "awaiting_information": {"under_review"},
    "approved": {"settled"},
    "settled": {"closed"},
    "rejected": set(),
    "closed": set(),
}


class ClaimListResource(Resource):
    @jwt_required()
    def get(self):
        user = current_user()
        query = Claim.query.join(Policy)
        if not is_staff(user):
            query = query.filter(Policy.user_id == user.id)
        claims = query.order_by(Claim.submitted_at.desc()).all()
        return {"claims": claims_schema.dump(claims)}, 200

    @jwt_required()
    @roles_required("customer")
    def post(self):
        user_id = int(get_jwt_identity())
        args = claim_post_parser.parse_args()
        policy = Policy.query.filter_by(
            id=args["policy_id"], user_id=user_id
        ).first()
        if policy is None:
            abort(404, message="Eligible policy not found.")
        if (
            policy.status.lower() != "active"
            or policy.start_date > date.today()
            or policy.end_date < date.today()
        ):
            abort(422, message="Claims can only be submitted against an active policy.")
        if args["amount_claimed"] <= 0:
            abort(422, message="Claim amount must be positive.")
        if Decimal(str(args["amount_claimed"])) > policy.coverage_amount:
            abort(422, message="Claim amount exceeds policy coverage.")
        description = args["description"].strip()
        if not description:
            abort(422, message="Claim description must not be empty.")

        claim = Claim(
            claim_number=f"CLM-{uuid4().hex[:12].upper()}",
            policy_id=policy.id,
            description=description,
            amount_claimed=Decimal(str(args["amount_claimed"])),
        )
        try:
            db.session.add(claim)
            db.session.flush()
            db.session.add(
                AuditLog(
                    user_id=user_id,
                    claim_id=claim.id,
                    action="claim_submitted",
                    description=f"Claim {claim.claim_number} submitted.",
                )
            )
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to submit claim.")
        return claim_schema.dump(claim), 201


class ClaimResource(Resource):
    @jwt_required()
    def get(self, claim_id):
        user = current_user()
        query = Claim.query.join(Policy).filter(Claim.id == claim_id)
        if not is_staff(user):
            query = query.filter(Policy.user_id == user.id)
        claim = query.first_or_404()
        return claim_schema.dump(claim), 200


class ClaimTransitionResource(Resource):
    @jwt_required()
    @roles_required("claims_officer", "admin")
    def post(self, claim_id):
        claim = db.get_or_404(Claim, claim_id)
        args = transition_parser.parse_args()
        target_status = args["status"].lower()
        if target_status not in TRANSITIONS.get(claim.status.lower(), set()):
            abort(
                422,
                message=f"Invalid claim transition: {claim.status} to {target_status}.",
            )

        approved_amount = args.get("amount_approved")
        if target_status == "approved":
            if approved_amount is None or approved_amount <= 0:
                abort(422, message="An approved claim requires a positive approved amount.")
            if Decimal(str(approved_amount)) > min(
                claim.amount_claimed, claim.policy.coverage_amount
            ):
                abort(422, message="Approved amount exceeds the claim or policy coverage.")
            claim.amount_approved = Decimal(str(approved_amount))
        elif approved_amount is not None:
            abort(422, message="Approved amount is only valid when approving a claim.")

        previous_status = claim.status
        claim.status = target_status
        db.session.add(
            AuditLog(
                user_id=int(get_jwt_identity()),
                claim_id=claim.id,
                action="claim_transition",
                description=f"Claim status changed from {previous_status} to {target_status}.",
            )
        )
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to update claim status.")
        return claim_schema.dump(claim), 200


api.add_resource(ClaimListResource, "/claims")
api.add_resource(ClaimResource, "/claims/<int:claim_id>")
api.add_resource(ClaimTransitionResource, "/claims/<int:claim_id>/transitions")
