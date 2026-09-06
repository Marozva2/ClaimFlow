from flask import Blueprint
from flask_restful import Api, Resource

health_bp = Blueprint("health_bp", __name__)
api = Api(health_bp)


class HealthResource(Resource):
    def get(self):
        return {"status": "healthy"}, 200


api.add_resource(HealthResource, "/health")
