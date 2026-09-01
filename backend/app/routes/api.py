from flask import Blueprint


api_bp = Blueprint("api", __name__)


@api_bp.get("/")
def api_home():
    return {
        "service": "ClaimFlow API",
        "version": "1.0.0",
        "status": "running",
    }