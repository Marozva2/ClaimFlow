import time
from decimal import Decimal

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import AuditLog, Claim, Policy


claims_bp = Blueprint(
    "claims",
    __name__,
    url_prefix="/api/claims",
)


@claims_bp.post("")
@jwt_required()
def submit_claim():
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    required_fields = [
        "policy_id",
        "description",
        "amount_claimed",
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

    policy = Policy.query.filter_by(
        id=data["policy_id"],
        user_id=user_id,
    ).first()

    if not policy:
        return {
            "error": "Policy not found"
        }, 404

    amount_claimed = Decimal(
        str(data["amount_claimed"])
    )

    if amount_claimed <= 0:
        return {
            "error": "Claim amount must be greater than zero"
        }, 400

    if amount_claimed > policy.coverage_amount:
        return {
            "error": "Claim amount exceeds policy coverage"
        }, 400

    claim = Claim(
        claim_number=f"CLM-{user_id}-{int(time.time())}",
        policy_id=policy.id,
        description=data["description"].strip(),
        amount_claimed=amount_claimed,
    )

    db.session.add(claim)

    db.session.flush()

    audit = AuditLog(
        user_id=user_id,
        claim_id=claim.id,
        action="CLAIM_SUBMITTED",
        description=(
            f"Claim {claim.claim_number} submitted."
        ),
    )

    db.session.add(audit)
    db.session.commit()

    return {
        "message": "Claim submitted successfully",
        "claim": claim.to_dict(),
    }, 201


@claims_bp.get("")
@jwt_required()
def list_claims():
    user_id = int(get_jwt_identity())

    claims = (
        Claim.query
        .join(Policy)
        .filter(Policy.user_id == user_id)
        .order_by(Claim.id.desc())
        .all()
    )

    return {
        "claims": [
            claim.to_dict()
            for claim in claims
        ]
    }