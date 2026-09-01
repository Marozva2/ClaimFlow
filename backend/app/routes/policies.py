from datetime import date
import time

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Policy


policies_bp = Blueprint(
    "policies",
    __name__,
    url_prefix="/api/policies",
)


@policies_bp.post("")
@jwt_required()
def create_policy():
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    required_fields = [
        "policy_type",
        "premium",
        "coverage_amount",
        "start_date",
        "end_date",
    ]

    missing = [
        field
        for field in required_fields
        if data.get(field) is None
    ]

    if missing:
        return {
            "error": "Missing required fields",
            "fields": missing,
        }, 400

    policy = Policy(
        policy_number=f"POL-{user_id}-{int(time.time())}",
        user_id=user_id,
        policy_type=data["policy_type"],
        premium=data["premium"],
        coverage_amount=data["coverage_amount"],
        start_date=date.fromisoformat(data["start_date"]),
        end_date=date.fromisoformat(data["end_date"]),
    )

    db.session.add(policy)
    db.session.commit()

    return {
        "policy": policy.to_dict()
    }, 201


@policies_bp.get("")
@jwt_required()
def list_policies():
    user_id = int(get_jwt_identity())

    policies = Policy.query.filter_by(
        user_id=user_id
    ).order_by(
        Policy.id.desc()
    ).all()

    return {
        "policies": [
            policy.to_dict()
            for policy in policies
        ]
    }