from datetime import date, datetime, time, timedelta, timezone

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from flask_restful import Api, Resource, abort
from sqlalchemy import or_

from models import AuditLog, User
from routes.authz import roles_required
from serializers import AuditLogSchema, UserSchema

admin_bp = Blueprint("admin_bp", __name__)
api = Api(admin_bp)
user_schema = UserSchema(many=True)
audit_schema = AuditLogSchema(many=True)


def pagination_args():
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
    except ValueError:
        abort(400, message="Pagination values must be positive integers.")
    if page < 1 or per_page < 1 or per_page > 100:
        abort(400, message="Page must be positive and per_page must be between 1 and 100.")
    return page, per_page


class AdminUsersResource(Resource):
    @jwt_required()
    @roles_required("admin")
    def get(self):
        query = User.query
        role = request.args.get("role")
        search = request.args.get("q", "").strip()
        if role:
            query = query.filter(User.role == role)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.email.ilike(pattern),
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                )
            )
        page, per_page = pagination_args()
        result = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        return {
            "users": user_schema.dump(result.items),
            "pagination": {
                "page": result.page,
                "per_page": result.per_page,
                "total": result.total,
                "pages": result.pages,
            },
        }, 200


class AdminAuditResource(Resource):
    @jwt_required()
    @roles_required("admin")
    def get(self):
        query = AuditLog.query
        action = request.args.get("action")
        search = request.args.get("q", "").strip()
        if action:
            query = query.filter(AuditLog.action == action)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    AuditLog.description.ilike(pattern),
                    AuditLog.action.ilike(pattern),
                )
            )
        try:
            if request.args.get("from"):
                query = query.filter(
                    AuditLog.created_at >= datetime.combine(
                        date.fromisoformat(request.args["from"]),
                        time.min,
                        tzinfo=timezone.utc,
                    )
                )
            if request.args.get("to"):
                next_day = date.fromisoformat(request.args["to"]) + timedelta(days=1)
                query = query.filter(
                    AuditLog.created_at
                    < datetime.combine(next_day, time.min, tzinfo=timezone.utc)
                )
        except ValueError:
            abort(400, message="Date filters must use YYYY-MM-DD format.")
        page, per_page = pagination_args()
        result = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        return {
            "events": audit_schema.dump(result.items),
            "pagination": {
                "page": result.page,
                "per_page": result.per_page,
                "total": result.total,
                "pages": result.pages,
            },
        }, 200


api.add_resource(AdminUsersResource, "/admin/users")
api.add_resource(AdminAuditResource, "/admin/audit")
