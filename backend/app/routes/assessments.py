from decimal import Decimal

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Assessment, AuditLog, Claim


assessments_bp = Blueprint(
    "assessments",
    __name__,
    url_prefix="/api/claims",
)


@assessments_bp.post("/<int:claim_id>/assess")
@jwt_required()
def assess_claim(claim_id):
    assessor_id = int(get_jwt_identity())

    claim = Claim.query.get(claim_id)

    if not claim:
        return {
            "error": "Claim not found"
        }, 404

    data = request.get_json() or {}

    recommendation = data.get("recommendation")

    if recommendation not in {
        "approved",
        "rejected",
        "partially_approved",
    }:
        return {
            "error": (
                "Recommendation must be approved, "
                "rejected, or partially_approved"
            )
        }, 400

    approved_amount = data.get("approved_amount")

    if recommendation == "rejected":
        approved_amount = Decimal("0")

    elif approved_amount is None:
        return {
            "error": "approved_amount is required"
        }, 400

    else:
        approved_amount = Decimal(
            str(approved_amount)
        )

    if approved_amount < 0:
        return {
            "error": "approved_amount cannot be negative"
        }, 400

    if approved_amount > claim.amount_claimed:
        return {
            "error": (
                "Approved amount cannot exceed "
                "amount claimed"
            )
        }, 400

    assessment = Assessment(
        claim_id=claim.id,
        assessor_id=assessor_id,
        recommendation=recommendation,
        approved_amount=approved_amount,
        notes=data.get("notes"),
    )

    claim.amount_approved = approved_amount

    if recommendation == "approved":
        claim.status = "approved"
    elif recommendation == "rejected":
        claim.status = "rejected"
    else:
        claim.status = "partially_approved"

    db.session.add(assessment)

    db.session.flush()

    audit = AuditLog(
        user_id=assessor_id,
        claim_id=claim.id,
        action="CLAIM_ASSESSED",
        description=(
            f"Claim {claim.claim_number} assessed as "
            f"{recommendation}."
        ),
    )

    db.session.add(audit)
    db.session.commit()

    return {
        "message": "Claim assessed successfully",
        "claim": claim.to_dict(),
        "assessment": assessment.to_dict(),
    }