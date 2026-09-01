from datetime import datetime, timezone

from app.extensions import db


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)

    claim_number = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    policy_id = db.Column(
        db.Integer,
        db.ForeignKey("policies.id"),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=False,
    )

    amount_claimed = db.Column(
        db.Numeric(12, 2),
        nullable=False,
    )

    amount_approved = db.Column(
        db.Numeric(12, 2),
        nullable=True,
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default="submitted",
    )

    submitted_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    policy = db.relationship(
        "Policy",
        back_populates="claims",
    )

    assessments = db.relationship(
        "Assessment",
        back_populates="claim",
        cascade="all, delete-orphan",
    )

    audit_logs = db.relationship(
        "AuditLog",
        back_populates="claim",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "claim_number": self.claim_number,
            "policy_id": self.policy_id,
            "description": self.description,
            "amount_claimed": float(self.amount_claimed),
            "amount_approved": (
                float(self.amount_approved)
                if self.amount_approved is not None
                else None
            ),
            "status": self.status,
            "submitted_at": self.submitted_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }