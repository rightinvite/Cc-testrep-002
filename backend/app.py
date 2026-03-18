import os
import json
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "horeca-checklist-secret-key-change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///horeca.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
CORS(app)
db = SQLAlchemy(app)

# --------------- Models ---------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="executor")  # admin | executor
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChecklistTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    category = db.Column(db.String(100), default="")
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    items_json = db.Column(db.Text, default="[]")

    creator = db.relationship("User", backref="templates")

    @property
    def items(self):
        return json.loads(self.items_json) if self.items_json else []

    @items.setter
    def items(self, value):
        self.items_json = json.dumps(value, ensure_ascii=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "created_by": self.created_by,
            "creator_name": self.creator.display_name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items": self.items,
        }


class ChecklistInstance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey("checklist_template.id"))
    name = db.Column(db.String(200), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    status = db.Column(db.String(20), default="active")  # active | completed
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)
    items_json = db.Column(db.Text, default="[]")

    template = db.relationship("ChecklistTemplate", backref="instances")
    assignee = db.relationship("User", foreign_keys=[assigned_to], backref="assigned_checklists")
    creator = db.relationship("User", foreign_keys=[created_by], backref="created_checklists")

    @property
    def items(self):
        return json.loads(self.items_json) if self.items_json else []

    @items.setter
    def items(self, value):
        self.items_json = json.dumps(value, ensure_ascii=False)

    def to_dict(self):
        return {
            "id": self.id,
            "template_id": self.template_id,
            "name": self.name,
            "assigned_to": self.assigned_to,
            "assignee_name": self.assignee.display_name if self.assignee else None,
            "created_by": self.created_by,
            "creator_name": self.creator.display_name if self.creator else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "items": self.items,
        }


class ActionLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey("checklist_instance.id"))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    action = db.Column(db.String(50), nullable=False)  # check | uncheck | reset | complete
    item_index = db.Column(db.Integer, nullable=True)
    item_text = db.Column(db.String(500), default="")
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    details = db.Column(db.Text, default="")

    user = db.relationship("User", backref="logs")
    checklist = db.relationship("ChecklistInstance", backref="logs")

    def to_dict(self):
        return {
            "id": self.id,
            "checklist_id": self.checklist_id,
            "user_id": self.user_id,
            "user_name": self.user.display_name if self.user else None,
            "action": self.action,
            "item_index": self.item_index,
            "item_text": self.item_text,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "details": self.details,
        }


# --------------- Auth helpers ---------------

# Simple token-based auth using a dict (in production, use JWT or sessions)
_tokens = {}

def get_current_user():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        user_id = _tokens.get(token)
        if user_id:
            return db.session.get(User, user_id)
    return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Требуется авторизация"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if request.current_user.role != "admin":
            return jsonify({"error": "Требуются права администратора"}), 403
        return f(*args, **kwargs)
    return decorated


# --------------- Routes: Static ---------------

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


# --------------- Routes: Auth ---------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get("username", "")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Неверный логин или пароль"}), 401
    import secrets
    token = secrets.token_hex(32)
    _tokens[token] = user.id
    return jsonify({"token": token, "user": user.to_dict()})

@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": request.current_user.to_dict()})

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        _tokens.pop(token, None)
    return jsonify({"ok": True})


# --------------- Routes: Users (admin) ---------------

@app.route("/api/users", methods=["GET"])
@login_required
def list_users():
    users = User.query.order_by(User.display_name).all()
    return jsonify([u.to_dict() for u in users])

@app.route("/api/users", methods=["POST"])
@admin_required
def create_user():
    data = request.get_json()
    if User.query.filter_by(username=data.get("username", "")).first():
        return jsonify({"error": "Пользователь с таким логином уже существует"}), 400
    user = User(
        username=data["username"],
        display_name=data.get("display_name", data["username"]),
        role=data.get("role", "executor"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route("/api/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404
    data = request.get_json()
    if "display_name" in data:
        user.display_name = data["display_name"]
    if "role" in data:
        user.role = data["role"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    db.session.commit()
    return jsonify(user.to_dict())

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"ok": True})


# --------------- Routes: Templates ---------------

@app.route("/api/templates", methods=["GET"])
@login_required
def list_templates():
    templates = ChecklistTemplate.query.order_by(ChecklistTemplate.updated_at.desc()).all()
    return jsonify([t.to_dict() for t in templates])

@app.route("/api/templates/<int:tid>", methods=["GET"])
@login_required
def get_template(tid):
    t = db.session.get(ChecklistTemplate, tid)
    if not t:
        return jsonify({"error": "Шаблон не найден"}), 404
    return jsonify(t.to_dict())

@app.route("/api/templates", methods=["POST"])
@admin_required
def create_template():
    data = request.get_json()
    t = ChecklistTemplate(
        name=data["name"],
        description=data.get("description", ""),
        category=data.get("category", ""),
        created_by=request.current_user.id,
    )
    t.items = data.get("items", [])
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201

@app.route("/api/templates/<int:tid>", methods=["PUT"])
@admin_required
def update_template(tid):
    t = db.session.get(ChecklistTemplate, tid)
    if not t:
        return jsonify({"error": "Шаблон не найден"}), 404
    data = request.get_json()
    if "name" in data:
        t.name = data["name"]
    if "description" in data:
        t.description = data["description"]
    if "category" in data:
        t.category = data["category"]
    if "items" in data:
        t.items = data["items"]
    db.session.commit()
    return jsonify(t.to_dict())

@app.route("/api/templates/<int:tid>", methods=["DELETE"])
@admin_required
def delete_template(tid):
    t = db.session.get(ChecklistTemplate, tid)
    if not t:
        return jsonify({"error": "Шаблон не найден"}), 404
    db.session.delete(t)
    db.session.commit()
    return jsonify({"ok": True})


# --------------- Routes: Checklist Instances ---------------

@app.route("/api/checklists", methods=["GET"])
@login_required
def list_checklists():
    q = ChecklistInstance.query
    if request.current_user.role != "admin":
        q = q.filter(
            (ChecklistInstance.assigned_to == request.current_user.id) |
            (ChecklistInstance.created_by == request.current_user.id)
        )
    status = request.args.get("status")
    if status:
        q = q.filter_by(status=status)
    checklists = q.order_by(ChecklistInstance.created_at.desc()).all()
    return jsonify([c.to_dict() for c in checklists])

@app.route("/api/checklists/<int:cid>", methods=["GET"])
@login_required
def get_checklist(cid):
    c = db.session.get(ChecklistInstance, cid)
    if not c:
        return jsonify({"error": "Чеклист не найден"}), 404
    return jsonify(c.to_dict())

@app.route("/api/checklists", methods=["POST"])
@login_required
def create_checklist():
    data = request.get_json()
    template = None
    items = data.get("items", [])
    if data.get("template_id"):
        template = db.session.get(ChecklistTemplate, data["template_id"])
        if template:
            items = template.items
    c = ChecklistInstance(
        template_id=data.get("template_id"),
        name=data.get("name", template.name if template else "Новый чеклист"),
        assigned_to=data.get("assigned_to"),
        created_by=request.current_user.id,
    )
    # Add checked=False to each item
    for item in items:
        if "checked" not in item:
            item["checked"] = False
    c.items = items
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201

@app.route("/api/checklists/<int:cid>/check", methods=["POST"])
@login_required
def check_item(cid):
    c = db.session.get(ChecklistInstance, cid)
    if not c:
        return jsonify({"error": "Чеклист не найден"}), 404
    data = request.get_json()
    idx = data["item_index"]
    checked = data["checked"]
    items = c.items
    if idx < 0 or idx >= len(items):
        return jsonify({"error": "Неверный индекс"}), 400
    items[idx]["checked"] = checked
    c.items = items
    # Log the action
    log = ActionLog(
        checklist_id=c.id,
        user_id=request.current_user.id,
        action="check" if checked else "uncheck",
        item_index=idx,
        item_text=items[idx].get("text", ""),
    )
    db.session.add(log)
    # Check if all items are done
    if all(item.get("checked") for item in items):
        c.status = "completed"
        c.completed_at = datetime.now(timezone.utc)
        complete_log = ActionLog(
            checklist_id=c.id,
            user_id=request.current_user.id,
            action="complete",
            details="Все пункты выполнены",
        )
        db.session.add(complete_log)
    else:
        c.status = "active"
        c.completed_at = None
    db.session.commit()
    return jsonify(c.to_dict())

@app.route("/api/checklists/<int:cid>/reset", methods=["POST"])
@login_required
def reset_checklist(cid):
    c = db.session.get(ChecklistInstance, cid)
    if not c:
        return jsonify({"error": "Чеклист не найден"}), 404
    items = c.items
    for item in items:
        item["checked"] = False
    c.items = items
    c.status = "active"
    c.completed_at = None
    log = ActionLog(
        checklist_id=c.id,
        user_id=request.current_user.id,
        action="reset",
        details="Все отметки сброшены",
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(c.to_dict())

@app.route("/api/checklists/<int:cid>", methods=["DELETE"])
@admin_required
def delete_checklist(cid):
    c = db.session.get(ChecklistInstance, cid)
    if not c:
        return jsonify({"error": "Чеклист не найден"}), 404
    ActionLog.query.filter_by(checklist_id=cid).delete()
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True})


# --------------- Routes: Logs ---------------

@app.route("/api/checklists/<int:cid>/logs", methods=["GET"])
@login_required
def get_logs(cid):
    logs = ActionLog.query.filter_by(checklist_id=cid).order_by(ActionLog.timestamp.desc()).all()
    return jsonify([l.to_dict() for l in logs])

@app.route("/api/logs", methods=["GET"])
@admin_required
def all_logs():
    limit = request.args.get("limit", 100, type=int)
    logs = ActionLog.query.order_by(ActionLog.timestamp.desc()).limit(limit).all()
    return jsonify([l.to_dict() for l in logs])


# --------------- Seed data ---------------

def seed_data():
    if User.query.first():
        return
    # Create admin
    admin = User(username="admin", display_name="Администратор", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    # Create executor
    executor = User(username="manager", display_name="Менеджер зала", role="executor")
    executor.set_password("manager123")
    db.session.add(executor)
    db.session.flush()

    # HORECA Templates
    templates = [
        {
            "name": "Открытие ресторана — утренний чеклист",
            "description": "Ежедневная проверка готовности заведения к открытию",
            "category": "Открытие",
            "items": [
                {"text": "Проверить чистоту входной группы и вывески", "section": "Вход"},
                {"text": "Включить освещение и проверить все лампы", "section": "Вход"},
                {"text": "Проверить температуру в зале (20-22°C)", "section": "Зал"},
                {"text": "Проверить чистоту столов и стульев", "section": "Зал"},
                {"text": "Расставить салфетницы, специи, меню", "section": "Зал"},
                {"text": "Проверить чистоту и наличие расходников в туалетах", "section": "Санузлы"},
                {"text": "Включить фоновую музыку", "section": "Зал"},
                {"text": "Проверить POS-терминалы и кассу", "section": "Касса"},
                {"text": "Проверить наличие разменных денег", "section": "Касса"},
                {"text": "Проверить температуру в холодильниках", "section": "Кухня"},
                {"text": "Проверить сроки годности полуфабрикатов", "section": "Кухня"},
                {"text": "Убедиться в готовности линии раздачи", "section": "Кухня"},
                {"text": "Проверить наличие чистой формы у персонала", "section": "Персонал"},
                {"text": "Провести утреннюю планёрку", "section": "Персонал"},
            ],
        },
        {
            "name": "Закрытие ресторана — вечерний чеклист",
            "description": "Проверка перед закрытием заведения",
            "category": "Закрытие",
            "items": [
                {"text": "Проводить последних гостей", "section": "Зал"},
                {"text": "Закрыть кассу, снять Z-отчёт", "section": "Касса"},
                {"text": "Пересчитать выручку и оформить инкассацию", "section": "Касса"},
                {"text": "Убрать и протереть все столы", "section": "Зал"},
                {"text": "Пропылесосить / вымыть пол", "section": "Зал"},
                {"text": "Проверить чистоту туалетов", "section": "Санузлы"},
                {"text": "Выключить оборудование на кухне", "section": "Кухня"},
                {"text": "Убрать продукты в холодильники", "section": "Кухня"},
                {"text": "Вынести мусор", "section": "Кухня"},
                {"text": "Выключить музыку и вывеску", "section": "Общее"},
                {"text": "Выключить свет, кондиционеры", "section": "Общее"},
                {"text": "Включить сигнализацию, закрыть двери", "section": "Общее"},
            ],
        },
        {
            "name": "Тайный покупатель — проверка ресторана",
            "description": "Полный чеклист оценки заведения тайным покупателем",
            "category": "Тайный покупатель",
            "items": [
                {"text": "Внешний вид фасада и вывески", "section": "Первое впечатление"},
                {"text": "Чистота входной зоны", "section": "Первое впечатление"},
                {"text": "Встреча хостес в течение 30 секунд", "section": "Первое впечатление"},
                {"text": "Приветствие и предложение столика", "section": "Сервис"},
                {"text": "Подача меню в течение 2 минут", "section": "Сервис"},
                {"text": "Официант представился", "section": "Сервис"},
                {"text": "Рекомендации по меню от официанта", "section": "Сервис"},
                {"text": "Заказ принят корректно", "section": "Сервис"},
                {"text": "Напитки поданы в течение 5 минут", "section": "Скорость"},
                {"text": "Блюда поданы в течение 20 минут", "section": "Скорость"},
                {"text": "Качество подачи блюд", "section": "Еда"},
                {"text": "Температура блюд соответствует норме", "section": "Еда"},
                {"text": "Вкус блюд соответствует ожиданиям", "section": "Еда"},
                {"text": "Проверка «Всё ли понравилось?»", "section": "Сервис"},
                {"text": "Чистота столовых приборов", "section": "Чистота"},
                {"text": "Чистота туалетных комнат", "section": "Чистота"},
                {"text": "Счёт принесён в течение 3 минут", "section": "Расчёт"},
                {"text": "Корректность счёта", "section": "Расчёт"},
                {"text": "Прощание с гостем", "section": "Сервис"},
            ],
        },
        {
            "name": "Проверка кухни — санитарные нормы",
            "description": "Контроль соблюдения санитарных норм на кухне",
            "category": "Санитария",
            "items": [
                {"text": "Персонал в чистой спецодежде", "section": "Персонал"},
                {"text": "Наличие медицинских книжек", "section": "Персонал"},
                {"text": "Руки вымыты, перчатки надеты", "section": "Персонал"},
                {"text": "Температура в холодильниках (0-4°C)", "section": "Хранение"},
                {"text": "Температура в морозильниках (-18°C и ниже)", "section": "Хранение"},
                {"text": "Маркировка контейнеров с датами", "section": "Хранение"},
                {"text": "Товарное соседство соблюдено", "section": "Хранение"},
                {"text": "Разделочные доски промаркированы", "section": "Оборудование"},
                {"text": "Чистота рабочих поверхностей", "section": "Чистота"},
                {"text": "Чистота вытяжки и вентиляции", "section": "Чистота"},
                {"text": "Мусорные баки закрыты и не переполнены", "section": "Чистота"},
                {"text": "Дезинфицирующие средства в наличии", "section": "Чистота"},
            ],
        },
        {
            "name": "Открытие отеля — утренняя смена ресепшн",
            "description": "Чеклист для утренней смены на ресепшн отеля",
            "category": "Отель",
            "items": [
                {"text": "Принять смену, проверить журнал", "section": "Начало смены"},
                {"text": "Проверить бронирования на сегодня", "section": "Бронирования"},
                {"text": "Подготовить ключ-карты для заезда", "section": "Бронирования"},
                {"text": "Проверить VIP-гостей и спецпожелания", "section": "Бронирования"},
                {"text": "Проверить чистоту лобби", "section": "Лобби"},
                {"text": "Свежие цветы / декор на месте", "section": "Лобби"},
                {"text": "Wi-Fi работает", "section": "Техника"},
                {"text": "PMS-система функционирует", "section": "Техника"},
                {"text": "Информационные материалы в наличии", "section": "Материалы"},
                {"text": "Проверить отзывы за прошлую ночь", "section": "Качество"},
            ],
        },
        {
            "name": "Инвентаризация бара",
            "description": "Чеклист для проведения инвентаризации бара",
            "category": "Бар",
            "items": [
                {"text": "Крепкий алкоголь — подсчёт остатков", "section": "Алкоголь"},
                {"text": "Вино — подсчёт остатков", "section": "Алкоголь"},
                {"text": "Пиво — подсчёт остатков", "section": "Алкоголь"},
                {"text": "Безалкогольные напитки", "section": "Напитки"},
                {"text": "Соки и фреши", "section": "Напитки"},
                {"text": "Сиропы и топпинги", "section": "Ингредиенты"},
                {"text": "Гарниры для коктейлей (лайм, мята и т.д.)", "section": "Ингредиенты"},
                {"text": "Одноразовая посуда (трубочки, зонтики)", "section": "Расходники"},
                {"text": "Чистота барной стойки", "section": "Чистота"},
                {"text": "Чистота барного оборудования", "section": "Чистота"},
                {"text": "Проверить сроки годности", "section": "Качество"},
            ],
        },
    ]

    for tpl_data in templates:
        tpl = ChecklistTemplate(
            name=tpl_data["name"],
            description=tpl_data["description"],
            category=tpl_data["category"],
            created_by=admin.id,
        )
        items_with_checked = [{"text": i["text"], "section": i.get("section", ""), "checked": False} for i in tpl_data["items"]]
        tpl.items = items_with_checked
        db.session.add(tpl)

    db.session.commit()


# --------------- Init ---------------

with app.app_context():
    db.create_all()
    seed_data()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
