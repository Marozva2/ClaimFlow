from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from models import Assessment, AuditLog, Claim, Policy, User, db


class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        sqla_session = db.session
        # Exclude sensitive attributes from dump/dumps
        exclude = ("password_hash",)


class PolicySchema(SQLAlchemyAutoSchema):
    premium = fields.Float()
    coverage_amount = fields.Float()

    class Meta:
        model = Policy
        load_instance = True
        sqla_session = db.session
        include_fk = True


class ClaimSchema(SQLAlchemyAutoSchema):
    amount_claimed = fields.Float()
    amount_approved = fields.Float(allow_none=True)

    class Meta:
        model = Claim
        load_instance = True
        sqla_session = db.session
        include_fk = True


class AssessmentSchema(SQLAlchemyAutoSchema):
    approved_amount = fields.Float(allow_none=True)

    class Meta:
        model = Assessment
        load_instance = True
        sqla_session = db.session
        include_fk = True


class AuditLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AuditLog
        load_instance = True
        sqla_session = db.session
        include_fk = True
