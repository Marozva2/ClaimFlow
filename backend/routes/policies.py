from datetime import date

from flask import Blueprint
from flask_jwt_extended import jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import AuditLog, Policy, db
from routes.authz import current_user, is_staff, roles_required
from serializers import PolicySchema
from sqlalchemy.exc import SQLAlchemyError

policies_bp = Blueprint("policies_bp", __name__)
api = Api(policies_bp)

policy_schema = PolicySchema()
policies_schema = PolicySchema(many=True)

policy_post_parser = reqparse.RequestParser()
policy_post_parser.add_argument("user_id", type=int, required=True)
policy_post_parser.add_argument("policy_number", type=str, required=True)
policy_post_parser.add_argument("policy_type", type=str, required=True)
policy_post_parser.add_argument("premium", type=float, required=True)
policy_post_parser.add_argument("coverage_amount", type=float, required=True)
policy_post_parser.add_argument("start_date", type=date.fromisoformat, required=True)
policy_post_parser.add_argument("end_date", type=date.fromisoformat, required=True)

policy_put_parser = reqparse.RequestParser()
policy_put_parser.add_argument("policy_type", type=str)
policy_put_parser.add_argument("premium", type=float)
policy_put_parser.add_argument("coverage_amount", type=float)
policy_put_parser.add_argument("start_date", type=date.fromisoformat)
policy_put_parser.add_argument("end_date", type=date.fromisoformat)
policy_put_parser.add_argument("status", type=str)


class PolicyListResource(Resource):
    @jwt_required()
    def get(self):
        user = current_user()
        query = Policy.query
        if not is_staff(user):
            query = query.filter_by(user_id=user.id)
        return {"policies": policies_schema.dump(query.all())}, 200

    @jwt_required()
    @roles_required("claims_officer", "admin")
    def post(self):
        args = policy_post_parser.parse_args()
        if args["premium"] < 0 or args["coverage_amount"] <= 0:
            abort(422, message="Premium and coverage amounts must be valid.")
        if args["end_date"] < args["start_date"]:
            abort(422, message="Policy end date must not precede start date.")
        if Policy.query.filter_by(policy_number=args["policy_number"]).first():
            abort(409, message="Policy with this number already exists.")

        policy = Policy(**args)
        try:
            db.session.add(policy)
            db.session.flush()
            db.session.add(
                AuditLog(
                    user_id=current_user().id,
                    action="policy_created",
                    description=f"Policy {policy.policy_number} created.",
                )
            )
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to create policy.")
        return policy_schema.dump(policy), 201


class PolicyResource(Resource):
    @jwt_required()
    def get(self, policy_id):
        user = current_user()
        query = Policy.query.filter_by(id=policy_id)
        if not is_staff(user):
            query = query.filter_by(user_id=user.id)
        return policy_schema.dump(query.first_or_404()), 200

    @jwt_required()
    @roles_required("claims_officer", "admin")
    def put(self, policy_id):
        policy = db.get_or_404(Policy, policy_id)
        args = policy_put_parser.parse_args()
        for key, value in args.items():
            if value is not None:
                setattr(policy, key, value)
        if policy.premium < 0 or policy.coverage_amount <= 0:
            abort(422, message="Premium and coverage amounts must be valid.")
        if policy.end_date < policy.start_date:
            abort(422, message="Policy end date must not precede start date.")
        try:
            db.session.add(
                AuditLog(
                    user_id=current_user().id,
                    action="policy_updated",
                    description=f"Policy {policy.policy_number} updated.",
                )
            )
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to update policy.")
        return policy_schema.dump(policy), 200


api.add_resource(PolicyListResource, "/policies")
api.add_resource(PolicyResource, "/policies/<int:policy_id>")
