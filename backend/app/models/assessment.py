from datetime import datetime, timezone

from app.extensions import db


class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)

    claim_id = db.Column(
        db.Integer,
        db.ForeignKey("claims.id"),
        nullable=False,
    )

    assessor_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    recommendation = db.Column(
        db.String(50),
        nullable=False,
    )

    approved_amount = db.Column(
        db.Numeric(12, 2),
        nullable=True,
    )

    notes = db.Column(
        db.Text,
        nullable=True,
    )

    assessed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    claim = db.relationship(
        "Claim",
        back_populates="assessments",
    )

    assessor = db.relationship(
        "User",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "assessor_id": self.assessor_id,
            "recommendation": self.recommendation,
            "approved_amount": (
                float(self.approved_amount)
                if self.approved_amount is not None
                else None
            ),
            "notes": self.notes,
            "assessed_at": self.assessed_at.isoformat(),
        }