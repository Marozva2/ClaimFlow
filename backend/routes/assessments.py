from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import Assessment, db
from serializers import AssessmentSchema
from sqlalchemy.exc import SQLAlchemyError

assessment_bp = Blueprint("assessment_bp", __name__)
api = Api(assessment_bp)

assessment_schema = AssessmentSchema()
assessments_schema = AssessmentSchema(many=True)

# Input Validation Parsers
assessment_post_parser = reqparse.RequestParser()
assessment_post_parser.add_argument(
    "claim_id", type=int, required=True, help="Claim ID is required"
)
assessment_post_parser.add_argument(
    "recommendation", type=str, required=True, help="Recommendation is required"
)
assessment_post_parser.add_argument("approved_amount", type=float)
assessment_post_parser.add_argument("notes", type=str)

assessment_put_parser = reqparse.RequestParser()
assessment_put_parser.add_argument("recommendation", type=str)
assessment_put_parser.add_argument("approved_amount", type=float)
assessment_put_parser.add_argument("notes", type=str)


class AssessmentListResource(Resource):
    @jwt_required()
    def get(self):
        assessments = Assessment.query.all()
        return assessments_schema.dump(assessments), 200

    @jwt_required()
    def post(self):
        current_user_id = int(get_jwt_identity())
        args = assessment_post_parser.parse_args()

        new_assessment = Assessment(
            claim_id=args["claim_id"],
            assessor_id=current_user_id,
            recommendation=args["recommendation"],
            approved_amount=args.get("approved_amount"),
            notes=args.get("notes"),
        )

        try:
            db.session.add(new_assessment)
            db.session.commit()
            return assessment_schema.dump(new_assessment), 201
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


class AssessmentResource(Resource):
    @jwt_required()
    def get(self, assessment_id):
        assessment = Assessment.query.get_or_404(assessment_id)
        return assessment_schema.dump(assessment), 200

    @jwt_required()
    def put(self, assessment_id):
        assessment = Assessment.query.get_or_404(assessment_id)
        args = assessment_put_parser.parse_args()

        for key, value in args.items():
            if value is not None:
                setattr(assessment, key, value)

        try:
            db.session.commit()
            return assessment_schema.dump(assessment), 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))

    @jwt_required()
    def delete(self, assessment_id):
        assessment = Assessment.query.get_or_404(assessment_id)

        try:
            db.session.delete(assessment)
            db.session.commit()
            return {"message": f"Assessment {assessment_id} deleted successfully"}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


api.add_resource(AssessmentListResource, "/assessments")
api.add_resource(AssessmentResource, "/assessments/<int:assessment_id>")
