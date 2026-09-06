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
    class Meta:
        model = Policy
        load_instance = True
        sqla_session = db.session
        include_fk = True


class ClaimSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Claim
        load_instance = True
        sqla_session = db.session
        include_fk = True


class AssessmentSchema(SQLAlchemyAutoSchema):
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
