# Blueprint: Интерактивное веб-приложение с чеклистами, формами и embed-виджетами

> Универсальный шаблон архитектуры для приложений типа: чеклисты, RSVP-формы,
> опросники, инспекции, бронирования — с маркетплейсом шаблонов и встраиваемыми виджетами.
> Целевая ниша в данном примере: HoReCa (отели, рестораны, кафе).

---

## 1. Стек технологий

### Frontend

| Технология | Зачем |
|-----------|-------|
| **Next.js 14+ (App Router)** | SSR/SSG, роутинг, API routes, отличный DX |
| **React 18+** | Компонентная архитектура, серверные компоненты |
| **TypeScript** | Типобезопасность на всех уровнях |
| **Tailwind CSS** | Быстрая стилизация, адаптивность, темизация |
| **shadcn/ui** | Готовые accessible-компоненты поверх Radix UI |
| **Zustand** | Лёгкий стейт-менеджер (альтернатива: Jotai) |
| **React Hook Form + Zod** | Валидация форм на клиенте и сервере |
| **Framer Motion** | Анимации drag-and-drop, переходы |
| **@dnd-kit** | Drag-and-drop для конструктора шаблонов |

### Backend

| Технология | Зачем |
|-----------|-------|
| **Next.js API Routes / Route Handlers** | Серверная логика рядом с фронтом |
| **Prisma ORM** | Типобезопасная работа с БД, миграции |
| **PostgreSQL** | Основная БД (JSON-поля для гибких структур) |
| **Redis** | Кэширование, сессии, rate limiting |
| **NextAuth.js (Auth.js v5)** | Аутентификация (email, Google, Telegram) |

### Инфраструктура и деплой

| Технология | Зачем |
|-----------|-------|
| **Vercel** | Деплой Next.js (или Railway / Render) |
| **Supabase** | PostgreSQL + Auth + Storage (альтернатива самостоятельному стеку) |
| **AWS S3 / Cloudflare R2** | Хранение файлов (логотипы, фото) |
| **Resend / Nodemailer** | Email-уведомления |
| **Stripe / PayPal** | Платежи за премиум-шаблоны |

### Инструменты разработки

| Технология | Зачем |
|-----------|-------|
| **pnpm** | Быстрый пакетный менеджер |
| **ESLint + Prettier** | Линтинг и форматирование |
| **Vitest + Testing Library** | Юнит- и интеграционные тесты |
| **Playwright** | E2E-тесты |
| **GitHub Actions** | CI/CD пайплайн |

---

## 2. Архитектура проекта

```
project/
├── prisma/
│   ├── schema.prisma          # Схема БД
│   └── seed.ts                # Начальные данные (шаблоны, демо-юзеры)
├── public/
│   └── templates/             # Превью шаблонов
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Навигация, сайдбар
│   │   │   ├── checklists/page.tsx    # Список чеклистов
│   │   │   ├── checklists/[id]/page.tsx
│   │   │   ├── templates/page.tsx     # Маркетплейс шаблонов
│   │   │   ├── constructor/page.tsx   # Визуальный конструктор
│   │   │   ├── forms/page.tsx         # RSVP / формы
│   │   │   ├── forms/[id]/page.tsx
│   │   │   ├── analytics/page.tsx     # Статистика и отчёты
│   │   │   └── settings/page.tsx      # Настройки аккаунта
│   │   ├── embed/                     # Встраиваемые виджеты (без навигации)
│   │   │   ├── form/[id]/page.tsx
│   │   │   ├── checklist/[id]/page.tsx
│   │   │   └── results/[id]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── checklists/route.ts
│   │   │   ├── templates/route.ts
│   │   │   ├── forms/route.ts
│   │   │   ├── embed/route.ts
│   │   │   ├── webhooks/route.ts
│   │   │   └── payments/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Лендинг
│   ├── components/
│   │   ├── ui/                        # shadcn/ui компоненты
│   │   ├── checklist/
│   │   │   ├── ChecklistCard.tsx
│   │   │   ├── ChecklistItem.tsx
│   │   │   └── ChecklistProgress.tsx
│   │   ├── constructor/
│   │   │   ├── Canvas.tsx
│   │   │   ├── ComponentPalette.tsx
│   │   │   ├── PropertyPanel.tsx
│   │   │   └── blocks/               # Готовые блоки конструктора
│   │   ├── forms/
│   │   │   ├── RSVPForm.tsx
│   │   │   ├── FormBuilder.tsx
│   │   │   └── FormRenderer.tsx
│   │   ├── embed/
│   │   │   ├── EmbedWrapper.tsx       # Обёртка без навигации
│   │   │   ├── EmbedConfigurator.tsx   # Настройки встраивания
│   │   │   └── EmbedCodeGenerator.tsx  # Генерация iframe-кода
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── db.ts                      # Prisma client
│   │   ├── auth.ts                    # NextAuth config
│   │   ├── validations.ts            # Zod-схемы
│   │   ├── embed.ts                   # Логика embed-виджетов
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useChecklist.ts
│   │   ├── useTemplate.ts
│   │   └── useEmbed.ts
│   ├── store/
│   │   ├── checklist-store.ts
│   │   └── constructor-store.ts
│   └── types/
│       ├── checklist.ts
│       ├── template.ts
│       ├── form.ts
│       └── embed.ts
├── .env.example
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 3. Модель данных (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Пользователи ───

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  role          Role      @default(USER)
  avatarUrl     String?
  telegramId    String?
  createdAt     DateTime  @default(now())

  checklists    Checklist[]
  templates     Template[]       @relation("AuthorTemplates")
  purchases     TemplatePurchase[]
  formResponses FormResponse[]
  assignments   Assignment[]
}

enum Role {
  USER
  ADMIN
  MANAGER
}

// ─── Чеклисты ───

model Checklist {
  id          String          @id @default(cuid())
  title       String
  description String?
  status      ChecklistStatus @default(ACTIVE)
  templateId  String?
  template    Template?       @relation(fields: [templateId], references: [id])
  ownerId     String
  owner       User            @relation(fields: [ownerId], references: [id])
  items       ChecklistItem[]
  assignments Assignment[]
  logs        ActionLog[]
  embedConfig EmbedConfig?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

enum ChecklistStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model ChecklistItem {
  id          String    @id @default(cuid())
  text        String
  checked     Boolean   @default(false)
  order       Int
  category    String?          // "кухня", "зал", "бар" и т.д.
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  checkedAt   DateTime?
  checkedBy   String?
}

model Assignment {
  id          String    @id @default(cuid())
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  assignedAt  DateTime  @default(now())
}

model ActionLog {
  id          String    @id @default(cuid())
  action      String           // "check", "uncheck", "reset", "create"
  details     Json?
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id])
  userId      String?
  createdAt   DateTime  @default(now())
}

// ─── Шаблоны и маркетплейс ───

model Template {
  id          String     @id @default(cuid())
  title       String
  description String?
  category    String            // "restaurant", "hotel", "bar", "cafe"
  items       Json              // [{text, category, order}]
  layout      Json?             // Конфигурация визуального лэйаута
  previewUrl  String?
  price       Decimal?   @default(0)  // 0 = бесплатный
  currency    String     @default("USD")
  authorId    String
  author      User       @relation("AuthorTemplates", fields: [authorId], references: [id])
  isPublic    Boolean    @default(false)
  downloads   Int        @default(0)
  rating      Float?
  tags        String[]
  checklists  Checklist[]
  purchases   TemplatePurchase[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model TemplatePurchase {
  id         String   @id @default(cuid())
  templateId String
  template   Template @relation(fields: [templateId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  amount     Decimal
  paymentId  String?         // ID из Stripe/PayPal
  createdAt  DateTime @default(now())
}

// ─── Формы (RSVP, опросы) ───

model Form {
  id          String         @id @default(cuid())
  title       String
  description String?
  fields      Json           // [{type, label, required, options}]
  settings    Json?          // {redirectUrl, successMessage, notifications}
  ownerId     String
  responses   FormResponse[]
  embedConfig EmbedConfig?
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model FormResponse {
  id        String   @id @default(cuid())
  formId    String
  form      Form     @relation(fields: [formId], references: [id])
  data      Json           // Ответы в свободной структуре
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  ipAddress String?
  createdAt DateTime @default(now())
}

// ─── Embed-виджеты ───

model EmbedConfig {
  id             String    @id @default(cuid())
  token          String    @unique @default(cuid())   // Публичный токен для iframe URL
  type           EmbedType
  checklistId    String?   @unique
  checklist      Checklist? @relation(fields: [checklistId], references: [id])
  formId         String?   @unique
  form           Form?      @relation(fields: [formId], references: [id])
  allowedDomains String[]          // Whitelist доменов
  theme          String    @default("light")  // "light" | "dark" | "auto"
  showLogo       Boolean   @default(true)
  showTitle      Boolean   @default(true)
  showPoweredBy  Boolean   @default(true)
  buttonColor    String?
  borderRadius   Int       @default(8)
  rateLimit      Int       @default(100)      // Запросов в час
  captchaEnabled Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum EmbedType {
  CHECKLIST_READONLY
  CHECKLIST_INTERACTIVE
  FORM
  RESULTS
}
```

---

## 4. Функциональные модули

### 4.1 Аутентификация и роли

```
Методы входа:
├── Email + пароль (bcrypt)
├── Google OAuth
├── Telegram Login Widget
└── Magic link (email)

Роли:
├── ADMIN   — полный доступ, управление пользователями
├── MANAGER — создание чеклистов, назначение, просмотр отчётов
└── USER    — выполнение назначенных чеклистов
```

### 4.2 Чеклисты

```
Возможности:
├── Создание из шаблона или с нуля
├── Категоризация пунктов (кухня, зал, бар, санитария)
├── Отметка пунктов с timestamp и user ID
├── Прогресс-бар выполнения
├── Сброс всех отметок (с логированием)
├── Назначение исполнителю
├── Журнал действий (кто, что, когда)
├── Дедлайны и напоминания
└── Экспорт в PDF
```

### 4.3 Визуальный конструктор шаблонов

```
Интерфейс:
┌─────────────────────────────────────────────────┐
│  Палитра блоков  │      Холст (Canvas)     │ Св-ва│
│                  │                          │      │
│  ☐ Текстовый     │  ┌──────────────────┐   │ Текст│
│  ☐ Чекбокс       │  │ Название раздела │   │ Цвет │
│  ☐ Раздел        │  ├──────────────────┤   │ Шрифт│
│  ☐ Фото-чек      │  │ ☐ Пункт 1       │   │      │
│  ☐ Рейтинг 1-5   │  │ ☐ Пункт 2       │   │      │
│  ☐ Комментарий   │  │ ☐ Пункт 3       │   │      │
│  ☐ Подпись       │  └──────────────────┘   │      │
│  ☐ Дата/время    │                          │      │
└─────────────────────────────────────────────────┘

Drag & Drop: @dnd-kit
Состояние конструктора: Zustand
Сохранение: JSON-структура в поле template.layout
```

### 4.4 Маркетплейс шаблонов

```
Структура:
├── Каталог с фильтрами (категория, цена, рейтинг, теги)
├── Карточка шаблона (превью, описание, отзывы)
├── Бесплатные + платные шаблоны
├── Авторские шаблоны (пользователи публикуют свои)
├── Покупка через Stripe / PayPal
├── Рейтинг и отзывы
└── Поиск по тегам и ключевым словам
```

### 4.5 RSVP / Формы

```
Типы полей:
├── Текстовое поле (одна строка / многострочное)
├── Email
├── Телефон
├── Выбор из списка (dropdown / radio / checkbox)
├── Дата и время
├── Количество гостей (number)
├── Загрузка файла
└── Подпись

После отправки:
├── Показать сообщение "Спасибо"
├── Редирект на URL
├── Отправить данные в Google Sheets (webhook)
├── Уведомить в Telegram
└── Отправить email подтверждение
```

### 4.6 Embed-виджеты (iframe)

```
Типы виджетов:
├── RSVP форма — бронирование на сайте ресторана
├── Чеклист (read-only) — показать стандарты заведения
├── Чеклист (интерактивный) — гость отмечает предпочтения
├── Результаты / рейтинг — публичный дашборд проверок
└── Меню-чеклист — предзаказ блюд

Embed URL:
  https://app.example.com/embed/form/{token}
  https://app.example.com/embed/checklist/{token}
  https://app.example.com/embed/results/{token}

Отличия embed-режима от основного:
  - Без навигации, хедера, сайдбара
  - Минимальный UI — только виджет
  - Публичный доступ (по токену)
  - Кастомизация цветов и стилей
  - Responsive для iframe

Настройки:
  - Внешний вид: тема, цвет кнопки, скругления, логотип
  - Поведение: действие после отправки, редирект, уведомления
  - Безопасность: whitelist доменов, rate limiting, CAPTCHA
  - Код: готовый <iframe> для копирования

Совместимость:
  - Canva сайты (блок Embed)
  - Tilda
  - Notion
  - Wix
  - Любой HTML-сайт

Авторесайз iframe (postMessage):
  Виджет отправляет parent.postMessage({ type: 'resize', height })
  На стороне сайта скрипт слушает и обновляет высоту iframe.
  В Canva авторесайз не работает — пользователь задаёт высоту вручную.

JavaScript SDK (расширение):
  <script src="https://app.example.com/sdk.js"></script>
  ChecklistApp.render('#container', { formId, theme, locale, onSubmit })
```

### 4.7 Интеграции

```
├── Google Sheets — автоматическая выгрузка ответов форм
├── Telegram Bot — уведомления о новых ответах, завершении чеклистов
├── Webhooks — POST-запрос на произвольный URL при событии
├── Email (Resend) — подтверждения, напоминания
└── Zapier / Make — через webhook для связи с 1000+ сервисами
```

### 4.8 Аналитика и отчёты

```
├── Процент выполнения чеклистов по дням/неделям
├── Среднее время выполнения
├── Статистика по исполнителям
├── Наиболее часто пропускаемые пункты
├── Воронка RSVP (открыли → начали → отправили)
├── Экспорт в CSV / PDF
└── Дашборд с графиками (Recharts / Chart.js)
```

---

## 5. Безопасность

### Общая

| Угроза | Защита |
|--------|--------|
| XSS | Санитизация ввода, CSP заголовки |
| CSRF | CSRF-токены (NextAuth встроенно) |
| SQL Injection | Prisma ORM (параметризованные запросы) |
| Brute force | Rate limiting (Redis), блокировка после N попыток |
| Утечка данных | Шифрование паролей (bcrypt), HTTPS only |

### Embed-виджеты

| Угроза | Защита |
|--------|--------|
| Спам через iframe | Rate limiting по IP + опциональная CAPTCHA |
| Кража embed-кода | Whitelist доменов (проверка Referer/Origin) |
| XSS через iframe | sandbox атрибут + Content-Security-Policy |
| Фейковые отправки | Серверная валидация + honeypot-поля |

---

## 6. Фазы разработки

```
Фаза 1 — MVP (2-3 недели)
├── Аутентификация (email + Google)
├── CRUD чеклистов
├── Базовые шаблоны (seed данные)
├── Назначение исполнителей
├── Журнал действий
└── Деплой на Vercel + Supabase

Фаза 2 — Конструктор (1-2 недели)
├── Визуальный конструктор шаблонов
├── Drag-and-drop блоки
├── Сохранение / загрузка лэйаутов
└── Превью шаблона

Фаза 3 — Формы и RSVP (1-2 недели)
├── Конструктор форм
├── Рендеринг и валидация
├── Сбор ответов
└── Уведомления (email, Telegram)

Фаза 4 — Маркетплейс (1-2 недели)
├── Каталог шаблонов
├── Публикация авторских шаблонов
├── Платежи (Stripe / PayPal)
├── Рейтинги и отзывы
└── Поиск и фильтрация

Фаза 5 — Интеграции (1 неделя)
├── Google Sheets
├── Webhooks
├── Telegram Bot
└── Zapier-совместимые хуки

Фаза 6 — Embed-виджеты (1 неделя)
├── Embed-роуты (без навигации)
├── Настройки виджета (тема, домены, rate limit)
├── Генератор iframe-кода
├── JavaScript SDK
└── Тестирование в Canva / Tilda / Notion

Фаза 7 — Аналитика и полировка (1 неделя)
├── Дашборд со статистикой
├── Экспорт отчётов
├── PWA (офлайн-чеклисты)
└── Оптимизация производительности
```

---

## 7. Переменные окружения (.env.example)

```bash
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/checklist_app"

# Аутентификация
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Redis
REDIS_URL="redis://localhost:6379"

# Файлы
S3_BUCKET=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_REGION="eu-central-1"

# Платежи
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
PAYPAL_CLIENT_ID=""
PAYPAL_SECRET=""

# Уведомления
RESEND_API_KEY=""
TELEGRAM_BOT_TOKEN=""

# Embed
EMBED_ALLOWED_ORIGINS="https://*.canva.site,https://*.tilda.ws"
```

---

## 8. Команды запуска

```bash
# Установка
pnpm install

# Настройка БД
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed

# Разработка
pnpm dev              # http://localhost:3000

# Тесты
pnpm test             # Vitest
pnpm test:e2e         # Playwright

# Сборка
pnpm build
pnpm start

# Утилиты Prisma
pnpm prisma studio    # GUI для БД
pnpm prisma migrate dev --name init
```

---

## 9. Адаптация под другие ниши

Этот blueprint подходит не только для HoReCa. Замените шаблоны и категории:

| Ниша | Категории чеклистов | Формы |
|------|---------------------|-------|
| **HoReCa** | Кухня, зал, бар, санитария | RSVP бронирование |
| **Клининг** | Офис, ванная, кухня, фасад | Заявка на уборку |
| **Строительство** | Фундамент, стены, кровля, отделка | Акт приёмки |
| **Медицина** | Приём, осмотр, назначения, процедуры | Запись на приём |
| **Образование** | Учебный план, экзамены, оценки | Регистрация на курс |
| **Мероприятия** | Площадка, кейтеринг, техника, гости | RSVP приглашение |
| **IT / DevOps** | Деплой, мониторинг, инциденты | Заявка в support |
| **Авиация** | Предполётный, послеполётный, cargo | Бронирование |

Для адаптации:
1. Измените seed-данные шаблонов в `prisma/seed.ts`
2. Обновите категории в enum/константах
3. Замените тексты и иконки в UI
4. Добавьте специфичные блоки в конструктор
