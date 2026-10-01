from decimal import Decimal

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import Assessment, AuditLog, Claim, db
from routes.authz import roles_required
from serializers import AssessmentSchema
from sqlalchemy.exc import SQLAlchemyError

assessment_bp = Blueprint("assessment_bp", __name__)
api = Api(assessment_bp)

assessment_schema = AssessmentSchema()
assessments_schema = AssessmentSchema(many=True)

assessment_post_parser = reqparse.RequestParser()
assessment_post_parser.add_argument("claim_id", type=int, required=True)
assessment_post_parser.add_argument("recommendation", type=str, required=True)
assessment_post_parser.add_argument("approved_amount", type=float)
assessment_post_parser.add_argument("notes", type=str)


class AssessmentListResource(Resource):
    @jwt_required()
    @roles_required("claims_officer", "admin")
    def get(self):
        assessments = Assessment.query.order_by(Assessment.assessed_at.desc()).all()
        return {"assessments": assessments_schema.dump(assessments)}, 200

    @jwt_required()
    @roles_required("claims_officer", "admin")
    def post(self):
        args = assessment_post_parser.parse_args()
        claim = db.get_or_404(Claim, args["claim_id"])
        recommendation = args["recommendation"].lower()
        if claim.status != "under_review":
            abort(422, message="Only claims under review can be assessed.")
        if recommendation not in {"approve", "reject", "request_information"}:
            abort(422, message="Recommendation must be approve, reject, or request_information.")

        approved_amount = args.get("approved_amount")
        if recommendation == "approve":
            if approved_amount is None or approved_amount <= 0:
                abort(422, message="An approval recommendation requires a positive amount.")
            if Decimal(str(approved_amount)) > min(
                claim.amount_claimed, claim.policy.coverage_amount
            ):
                abort(422, message="Recommended amount exceeds the claim or policy coverage.")
        elif approved_amount is not None:
            abort(422, message="Approved amount is only valid for an approval recommendation.")

        assessment = Assessment(
            claim_id=claim.id,
            assessor_id=int(get_jwt_identity()),
            recommendation=recommendation,
            approved_amount=(
                Decimal(str(approved_amount)) if approved_amount is not None else None
            ),
            notes=args.get("notes"),
        )
        try:
            db.session.add(assessment)
            db.session.flush()
            db.session.add(
                AuditLog(
                    user_id=int(get_jwt_identity()),
                    claim_id=claim.id,
                    action="claim_assessed",
                    description=f"Claim assessment recorded with recommendation: {recommendation}.",
                )
            )
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to record assessment.")
        return assessment_schema.dump(assessment), 201


class AssessmentResource(Resource):
    @jwt_required()
    @roles_required("claims_officer", "admin")
    def get(self, assessment_id):
        assessment = db.get_or_404(Assessment, assessment_id)
        return assessment_schema.dump(assessment), 200


api.add_resource(AssessmentListResource, "/assessments")
api.add_resource(AssessmentResource, "/assessments/<int:assessment_id>")
