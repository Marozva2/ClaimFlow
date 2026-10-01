from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import Assessment, AuditLog, Claim, Policy, User, db
from routes.authz import current_user, is_staff, roles_required
from serializers import AssessmentSchema, AuditLogSchema, ClaimSchema
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

claims_bp = Blueprint("claims_bp", __name__)
api = Api(claims_bp)

claim_schema = ClaimSchema()
audit_logs_schema = AuditLogSchema(many=True)
assessment_schema = AssessmentSchema(many=True)

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


def serialize_claim(claim, include_customer=False):
    payload = claim_schema.dump(claim)
    payload["policy"] = {
        "id": claim.policy.id,
        "policy_number": claim.policy.policy_number,
        "policy_type": claim.policy.policy_type,
        "coverage_amount": float(claim.policy.coverage_amount),
        "status": claim.policy.status,
    }
    if include_customer:
        payload["customer"] = {
            "id": claim.policy.user.id,
            "first_name": claim.policy.user.first_name,
            "last_name": claim.policy.user.last_name,
            "email": claim.policy.user.email,
        }
    return payload


class ClaimListResource(Resource):
    @jwt_required()
    def get(self):
        user = current_user()
        query = Claim.query.join(Policy).join(
            User, Policy.user_id == User.id
        )
        if not is_staff(user):
            query = query.filter(Policy.user_id == user.id)
        search = request.args.get("q", "").strip()
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Claim.claim_number.ilike(pattern),
                    Claim.description.ilike(pattern),
                    Policy.policy_number.ilike(pattern),
                    Policy.policy_type.ilike(pattern),
                    User.email.ilike(pattern),
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                )
            )
        status = request.args.get("status", "").lower()
        if status == "open":
            query = query.filter(
                Claim.status.notin_(("settled", "closed", "rejected"))
            )
        elif status:
            query = query.filter(Claim.status == status)
        policy_id = request.args.get("policy_id")
        if policy_id:
            try:
                query = query.filter(Claim.policy_id == int(policy_id))
            except ValueError:
                abort(400, message="Policy filter must be a valid policy ID.")
        try:
            if request.args.get("from"):
                query = query.filter(
                    Claim.submitted_at >= datetime.combine(
                        date.fromisoformat(request.args["from"]),
                        time.min,
                        tzinfo=timezone.utc,
                    )
                )
            if request.args.get("to"):
                next_day = date.fromisoformat(request.args["to"]) + timedelta(days=1)
                query = query.filter(
                    Claim.submitted_at
                    < datetime.combine(next_day, time.min, tzinfo=timezone.utc)
                )
        except ValueError:
            abort(400, message="Date filters must use YYYY-MM-DD format.")

        if "page" in request.args or "per_page" in request.args:
            try:
                page = int(request.args.get("page", 1))
                per_page = int(request.args.get("per_page", 10))
            except ValueError:
                abort(400, message="Pagination values must be positive integers.")
            if page < 1 or per_page < 1 or per_page > 100:
                abort(400, message="Page must be positive and per_page must be between 1 and 100.")
            pagination = query.order_by(Claim.submitted_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            return {
                "claims": [
                    serialize_claim(claim, include_customer=is_staff(user))
                    for claim in pagination.items
                ],
                "pagination": {
                    "page": pagination.page,
                    "per_page": pagination.per_page,
                    "total": pagination.total,
                    "pages": pagination.pages,
                },
            }, 200
        claims = query.order_by(Claim.submitted_at.desc()).all()
        return {
            "claims": [
                serialize_claim(claim, include_customer=is_staff(user))
                for claim in claims
            ]
        }, 200

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
        return serialize_claim(claim, include_customer=is_staff(user)), 200


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
        approval = None
        if target_status in {"approved", "rejected"}:
            expected_recommendation = (
                "approve" if target_status == "approved" else "reject"
            )
            approval = Assessment.query.filter_by(
                claim_id=claim.id, recommendation=expected_recommendation
            ).order_by(Assessment.assessed_at.desc()).first()
            if approval is None:
                assessment_type = (
                    "approval" if target_status == "approved" else "rejection"
                )
                article = "an" if assessment_type == "approval" else "a"
                decision = (
                    "approving" if target_status == "approved" else "rejecting"
                )
                abort(
                    422,
                    message=f"Record {article} {assessment_type} assessment before {decision} this claim.",
                )
        if target_status == "approved":
            if approval.approved_amount is None:
                abort(422, message="The approval assessment has no recommended amount.")
            if approved_amount is None or approved_amount <= 0:
                abort(422, message="An approved claim requires a positive approved amount.")
            if Decimal(str(approved_amount)) > min(
                claim.amount_claimed, claim.policy.coverage_amount
            ):
                abort(422, message="Approved amount exceeds the claim or policy coverage.")
            if Decimal(str(approved_amount)) > approval.approved_amount:
                abort(
                    422,
                    message="Approved amount cannot exceed the amount recommended in the assessment.",
                )
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


class ClaimAuditResource(Resource):
    @jwt_required()
    def get(self, claim_id):
        user = current_user()
        query = Claim.query.join(Policy).filter(Claim.id == claim_id)
        if not is_staff(user):
            query = query.filter(Policy.user_id == user.id)
        claim = query.first_or_404()
        logs = AuditLog.query.filter_by(claim_id=claim.id).order_by(
            AuditLog.created_at.desc()
        ).all()
        return {"events": audit_logs_schema.dump(logs)}, 200


class ClaimAssessmentsResource(Resource):
    @jwt_required()
    @roles_required("claims_officer", "admin")
    def get(self, claim_id):
        db.get_or_404(Claim, claim_id)
        assessments = Assessment.query.filter_by(claim_id=claim_id).order_by(
            Assessment.assessed_at.desc()
        ).all()
        return {"assessments": assessment_schema.dump(assessments)}, 200


api.add_resource(ClaimListResource, "/claims")
api.add_resource(ClaimResource, "/claims/<int:claim_id>")
api.add_resource(ClaimTransitionResource, "/claims/<int:claim_id>/transitions")
api.add_resource(ClaimAuditResource, "/claims/<int:claim_id>/audit")
api.add_resource(
    ClaimAssessmentsResource, "/claims/<int:claim_id>/assessments"
)
