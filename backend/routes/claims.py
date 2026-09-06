from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Api, Resource, abort, reqparse
from models import Claim, db
from serializers import ClaimSchema
from sqlalchemy.exc import SQLAlchemyError

claims_bp = Blueprint("claims_bp", __name__)
api = Api(claims_bp)

claim_schema = ClaimSchema()
claims_schema = ClaimSchema(many=True)

# Input Validation Parsers
claim_post_parser = reqparse.RequestParser()
claim_post_parser.add_argument(
    "claim_number", type=str, required=True, help="Claim number is required"
)
claim_post_parser.add_argument(
    "policy_id", type=int, required=True, help="Policy ID is required"
)
claim_post_parser.add_argument(
    "description", type=str, required=True, help="Description is required"
)
claim_post_parser.add_argument(
    "amount_claimed", type=float, required=True, help="Amount claimed is required"
)

claim_put_parser = reqparse.RequestParser()
claim_put_parser.add_argument("description", type=str)
claim_put_parser.add_argument("amount_claimed", type=float)
claim_put_parser.add_argument("amount_approved", type=float)
claim_put_parser.add_argument("status", type=str)


class ClaimListResource(Resource):
    @jwt_required()
    def get(self):
        current_user_id = int(get_jwt_identity())
        claims = Claim.query.filter_by(user_id=current_user_id).all()
        return claims_schema.dump(claims), 200

    @jwt_required()
    def post(self):
        args = claim_post_parser.parse_args()

        existing_claim = Claim.query.filter_by(
            claim_number=args["claim_number"]
        ).first()
        if existing_claim:
            abort(409, detail="Claim with this number already exists.")

        new_claim = Claim(
            claim_number=args["claim_number"],
            policy_id=args["policy_id"],
            description=args["description"],
            amount_claimed=args["amount_claimed"],
        )

        try:
            db.session.add(new_claim)
            db.session.commit()
            return claim_schema.dump(new_claim), 201
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


class ClaimResource(Resource):
    @jwt_required()
    def get(self, claim_id):
        claim = Claim.query.get_or_404(claim_id)
        return claim_schema.dump(claim), 200

    @jwt_required()
    def put(self, claim_id):
        claim = Claim.query.get_or_404(claim_id)
        args = claim_put_parser.parse_args()

        for key, value in args.items():
            if value is not None:
                setattr(claim, key, value)

        try:
            db.session.commit()
            return claim_schema.dump(claim), 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))

    @jwt_required()
    def delete(self, claim_id):
        claim = Claim.query.get_or_404(claim_id)

        try:
            db.session.delete(claim)
            db.session.commit()
            return {"message": f"Claim {claim_id} deleted successfully"}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))


api.add_resource(ClaimListResource, "/claims")
api.add_resource(ClaimResource, "/claims/<int:claim_id>")
