from flask import Blueprint
from flask_restful import Api, Resource

health_bp = Blueprint("health_bp", __name__)
api = Api(health_bp)


class HealthResource(Resource):
    def get(self):
        return {"status": "ok", "service": "claimflow-api"}, 200


api.add_resource(HealthResource, "/health")
