# Mukit - Collaborative Document Editor

Масштабируемая система для совместного редактирования документов с современным интерфейсом и real-time collaboration.

## 🚀 Особенности

- **Real-time Collaboration** - Совместное редактирование в реальном времени
- **Масштабируемая архитектура** - FastAPI + SQLAlchemy + PostgreSQL
- **Современный UI** - React с Tailwind CSS
- **Система прав доступа** - Гибкая система разрешений
- **Версионирование документов** - Полная история изменений
- **Комментарии и обсуждения** - Древовидная система комментариев
- **Полиморфные блоки** - Различные типы контента (текст, таблицы, код, изображения)
- **WebSocket интеграция** - Real-time уведомления и синхронизация
- **Качество кода** - Комплексная система линтинга и форматирования

## 🏗️ Архитектура

### Backend (FastAPI)
- **FastAPI** - Современный веб-фреймворк для Python
- **SQLAlchemy** - ORM с поддержкой async/await
- **PostgreSQL** - Основная база данных с asyncpg
- **WebSocket** - Real-time collaboration
- **JWT Authentication** - Безопасная аутентификация
- **Pydantic** - Валидация данных

### Frontend (React)
- **React 18** - Современная библиотека UI
- **TypeScript** - Типизированный JavaScript
- **Tailwind CSS** - Utility-first CSS фреймворк
- **React Query** - Управление состоянием сервера
- **React Router** - Клиентская маршрутизация
- **Monaco Editor** - Продвинутый редактор кода
- **Socket.IO** - WebSocket клиент

## 📊 Модели данных

### User
- Профиль пользователя с настройками
- Аватар и биография
- Система верификации

### Workspace
- Рабочие пространства (организации)
- Управление участниками
- Роли и права доступа

### Document
- Метаинформация документа
- Настройки доступа
- Связь с workspace

### DocumentVersion
- История версий с хешами
- Авторы изменений
- Описания изменений

### Permission
- Гибкая система прав
- Владелец, редактор, комментатор, читатель
- Временные ограничения

### Comment & CommentThread
- Древовидные комментарии
- Привязка к контенту
- Система разрешения

### Block (Полиморфная модель)
- Различные типы контента
- Текст, заголовки, таблицы, код, изображения
- Иерархическая структура

## 🚀 Быстрый старт

### Предварительные требования

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis (опционально)

### Установка Backend

```bash
# Клонирование репозитория
git clone <repository-url>
cd mukit-py

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Переход в директорию бэкенда
cd backend

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp env.example .env
# Отредактируйте .env файл с вашими настройками

# Инициализация базы данных
alembic upgrade head

# Запуск сервера
python run.py
```

**Или используйте удобный скрипт:**
```bash
# Из корня проекта
./run-backend.sh
```

### Установка Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

**Или используйте удобный скрипт:**
```bash
# Из корня проекта
./run-frontend.sh
```

### Запуск в разных терминалах

Для удобной разработки вы можете запустить бэкенд и фронтенд в разных терминалах:

```bash
# Терминал 1 - Бэкенд
./run-backend.sh

# Терминал 2 - Фронтенд
./run-frontend.sh
```

Скрипты автоматически:
- Проверяют и создают виртуальное окружение (для бэкенда)
- Устанавливают зависимости при необходимости
- Показывают полезную информацию о запущенных серверах

### Переменные окружения Frontend

Создайте файл `.env` в папке `frontend`:

```env
VITE_API_URL=http://localhost:8888/api/v1
VITE_WS_URL=ws://localhost:8888
```

### Настройка базы данных

```bash
# Создание базы данных PostgreSQL
createdb mukit_db

# Настройка переменных окружения
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/mukit_db
```

## 🔧 Инструменты качества кода

### Backend (Python/FastAPI)
- **Ruff** - Быстрый линтер и форматтер (замена flake8, isort, black)
- **MyPy** - Статический анализатор типов
- **Bandit** - Поиск уязвимостей безопасности
- **pip-audit** - Проверка уязвимостей в зависимостях (альтернатива Safety)
- **Pre-commit** - Git хуки для автоматической проверки

### Frontend (React/TypeScript)
- **ESLint** - Линтер JavaScript/TypeScript
- **Prettier** - Форматтер кода
- **TypeScript** - Проверка типов (встроена)
- **Husky** - Git хуки
- **lint-staged** - Проверка только измененных файлов

### Команды для запуска линтеров

```bash
# Все линтеры
make lint
# или
./lint.sh

# Только backend
make lint-backend

# Только frontend
make lint-frontend

# Установка pre-commit хуков
cd backend && source ../venv/bin/activate && pre-commit install
cd frontend && npm run prepare
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/mukit_db

# Redis (опционально)
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:3333,http://localhost:5173

# Upload
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads
```

## 📚 API Документация

После запуска сервера, документация API доступна по адресам:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Основные endpoints

#### Аутентификация
- `POST /api/v1/auth/register` - Регистрация пользователя
- `POST /api/v1/auth/login` - Вход в систему
- `GET /api/v1/auth/me` - Получение текущего пользователя

#### Workspaces
- `GET /api/v1/workspaces` - Список workspace
- `POST /api/v1/workspaces` - Создание workspace
- `GET /api/v1/workspaces/{id}` - Получение workspace
- `PUT /api/v1/workspaces/{id}` - Обновление workspace

#### Documents
- `GET /api/v1/documents` - Список документов
- `POST /api/v1/documents` - Создание документа
- `GET /api/v1/documents/{id}` - Получение документа
- `PUT /api/v1/documents/{id}` - Обновление документа
- `DELETE /api/v1/documents/{id}` - Удаление документа

#### WebSocket
- `WS /api/v1/documents/{document_id}/ws` - Real-time collaboration

## 🎨 Frontend

### Структура компонентов

```
src/
├── components/          # Переиспользуемые компоненты
│   ├── Layout.tsx      # Основной макет
│   └── ProtectedRoute.tsx
├── contexts/           # React Context
│   └── AuthContext.tsx
├── hooks/              # Custom hooks
│   └── useWebSocket.ts
├── pages/              # Страницы приложения
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Workspace.tsx
│   └── Document.tsx
├── services/           # API сервисы
│   └── api.ts
└── types/              # TypeScript типы
    └── index.ts
```

### Основные функции

- **Аутентификация** - Регистрация и вход
- **Dashboard** - Обзор workspace и документов
- **Workspace Management** - Управление рабочими пространствами
- **Document Editor** - Редактирование документов
- **Real-time Collaboration** - Совместная работа
- **Comments System** - Система комментариев

## 🔒 Безопасность

- **JWT токены** для аутентификации
- **CORS** настройки для безопасности
- **Валидация данных** с Pydantic
- **Хеширование паролей** с bcrypt
- **Проверка прав доступа** на уровне API

## 🚀 Развертывание

### Docker (рекомендуется)

```bash
# Создание Docker Compose файла
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: mukit_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
  
  backend:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://user:password@db:5432/mukit_db
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Production настройки

- Используйте переменные окружения для секретов
- Настройте HTTPS
- Используйте reverse proxy (Nginx)
- Настройте мониторинг и логирование
- Используйте CDN для статических файлов

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [Issues](https://github.com/your-repo/issues)
2. Создайте новый Issue с подробным описанием
3. Обратитесь к документации API

## 🎯 Roadmap

- [ ] Мобильное приложение
- [ ] Интеграция с внешними сервисами
- [ ] Расширенная аналитика
- [ ] Плагинная система
- [ ] Offline режим
- [ ] Видео/аудио комментарии

