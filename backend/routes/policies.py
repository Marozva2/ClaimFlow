from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import Policy, db
from serializers import PolicySchema
from sqlalchemy.exc import SQLAlchemyError

policies_bp = Blueprint("policies_bp", __name__)
api = Api(policies_bp)

policy_schema = PolicySchema()
policies_schema = PolicySchema(many=True)

# Input Validation Parsers
policy_post_parser = reqparse.RequestParser()
policy_post_parser.add_argument(
    "policy_number", type=str, required=True, help="Policy number is required"
)
policy_post_parser.add_argument(
    "policy_type", type=str, required=True, help="Policy type is required"
)
policy_post_parser.add_argument(
    "premium", type=float, required=True, help="Premium is required"
)
policy_post_parser.add_argument(
    "coverage_amount", type=float, required=True, help="Coverage amount is required"
)
policy_post_parser.add_argument(
    "start_date", type=str, required=True, help="Start date is required"
)
policy_post_parser.add_argument(
    "end_date", type=str, required=True, help="End date is required"
)

policy_put_parser = reqparse.RequestParser()
policy_put_parser.add_argument("policy_type", type=str)
policy_put_parser.add_argument("premium", type=float)
policy_put_parser.add_argument("coverage_amount", type=float)
policy_put_parser.add_argument("start_date", type=str)
policy_put_parser.add_argument("end_date", type=str)
policy_put_parser.add_argument("status", type=str)


class PolicyListResource(Resource):
    @jwt_required()
    def get(self):
        current_user_id = int(get_jwt_identity())
        policies = Policy.query.filter_by(user_id=current_user_id).all()
        return policies_schema.dump(policies), 200

    @jwt_required()
    def post(self):
        current_user_id = int(get_jwt_identity())
        args = policy_post_parser.parse_args()

        existing_policy = Policy.query.filter_by(
            policy_number=args["policy_number"]
        ).first()
        if existing_policy:
            abort(409, detail="Policy with this number already exists.")

        new_policy = Policy(
            user_id=current_user_id,
            policy_number=args["policy_number"],
            policy_type=args["policy_type"],
            premium=args["premium"],
            coverage_amount=args["coverage_amount"],
            start_date=args["start_date"],
            end_date=args["end_date"],
        )

        try:
            db.session.add(new_policy)
            db.session.commit()
            return policy_schema.dump(new_policy), 201
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


class PolicyResource(Resource):
    @jwt_required()
    def get(self, policy_id):
        policy = Policy.query.get_or_404(policy_id)
        return policy_schema.dump(policy), 200

    @jwt_required()
    def put(self, policy_id):
        policy = Policy.query.get_or_404(policy_id)
        args = policy_put_parser.parse_args()

        for key, value in args.items():
            if value is not None:
                setattr(policy, key, value)

        try:
            db.session.commit()
            return policy_schema.dump(policy), 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))

    @jwt_required()
    def delete(self, policy_id):
        policy = Policy.query.get_or_404(policy_id)

        try:
            db.session.delete(policy)
            db.session.commit()
            return {"message": f"Policy {policy_id} deleted successfully"}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


api.add_resource(PolicyListResource, "/policies")
api.add_resource(PolicyResource, "/policies/<int:policy_id>")
