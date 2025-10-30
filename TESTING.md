# 🧪 Тестирование Mukit

Документация по запуску тестов для проекта Mukit.

## 🚀 Быстрый старт

```bash
# Запустить все тесты
./test.sh

# Или через Makefile
make test
```

## 📋 Доступные команды

### Основные команды

| Команда | Описание | Пример |
|---------|----------|--------|
| `./test.sh` | Запустить все тесты (по умолчанию) | `./test.sh all` |
| `./test.sh backend` | Только backend тесты | `./test.sh backend` |
| `./test.sh frontend` | Только frontend тесты | `./test.sh frontend` |
| `./test.sh coverage` | Тесты с покрытием кода | `./test.sh coverage` |
| `./test.sh help` | Показать справку | `./test.sh help` |

### Команды Makefile

| Команда | Описание |
|---------|----------|
| `make test` | Запустить все тесты |
| `make test-backend` | Только backend тесты |
| `make test-frontend` | Только frontend тесты |
| `make test-coverage` | Тесты с покрытием |

## 🔧 Backend тесты

### Технологии
- **Pytest** - основной фреймворк тестирования
- **httpx.AsyncClient** - HTTP клиент для тестирования API
- **PostgreSQL** - тестовая база данных
- **pytest-asyncio** - поддержка async/await

### Структура тестов
```
backend/tests/
├── api/                    # API endpoints тесты
│   ├── test_auth.py       # Аутентификация
│   ├── test_documents.py  # Документы
│   └── test_workspaces.py # Рабочие пространства
├── core/                   # Core модули
│   └── test_security.py   # Безопасность
└── websocket/              # WebSocket тесты
    └── test_connection_manager.py
```

### Запуск backend тестов
```bash
# Все backend тесты
./test.sh backend

# С покрытием
cd backend && . ../venv/bin/activate && python -m pytest tests/ --cov=app --cov-report=html
```

## 🎨 Frontend тесты

### Технологии
- **Vitest** - быстрый тестовый фреймворк
- **@testing-library/react** - тестирование React компонентов
- **@testing-library/jest-dom** - дополнительные матчеры
- **jsdom** - DOM окружение для тестов

### Структура тестов
```
frontend/src/test/
├── components/             # Компоненты
│   ├── Login.test.tsx     # Форма входа
│   └── Dashboard.test.tsx # Дашборд
├── hooks/                  # Хуки
│   └── useWebSocket.test.ts
└── services/               # Сервисы
    └── api.test.ts
```

### Запуск frontend тестов
```bash
# Все frontend тесты
./test.sh frontend

# Интерактивный режим
cd frontend && npm test

# С покрытием
cd frontend && npm run test:run -- --coverage
```

## 📊 Покрытие кода

### Backend покрытие
```bash
# Генерация HTML отчета
cd backend && . ../venv/bin/activate && python -m pytest tests/ --cov=app --cov-report=html

# Отчет будет доступен в backend/htmlcov/index.html
```

### Frontend покрытие
```bash
# Генерация отчета покрытия
cd frontend && npm run test:run -- --coverage

# Отчет будет доступен в frontend/coverage/index.html
```

## 🐛 Отладка тестов

### Backend отладка
```bash
# Запуск с подробным выводом
cd backend && . ../venv/bin/activate && python -m pytest tests/ -v -s

# Запуск конкретного теста
cd backend && . ../venv/bin/activate && python -m pytest tests/api/test_auth.py::test_register_user -v

# Запуск с остановкой на первой ошибке
cd backend && . ../venv/bin/activate && python -m pytest tests/ -x
```

### Frontend отладка
```bash
# Интерактивный режим с watch
cd frontend && npm test

# Запуск конкретного теста
cd frontend && npm run test:run -- Login.test.tsx

# Запуск с UI
cd frontend && npm run test:ui
```

## ⚙️ Конфигурация

### Backend конфигурация
- `backend/pytest.ini` - настройки pytest
- `backend/tests/conftest.py` - фикстуры и конфигурация
- `backend/requirements.txt` - тестовые зависимости

### Frontend конфигурация
- `frontend/vitest.config.ts` - настройки Vitest
- `frontend/src/test/setup.ts` - настройка тестового окружения
- `frontend/package.json` - тестовые скрипты

## 🚨 Устранение неполадок

### Проблемы с backend тестами
1. **Ошибка подключения к БД**: Проверьте, что PostgreSQL запущен
2. **Ошибки импорта**: Убедитесь, что виртуальное окружение активировано
3. **Ошибки async**: Проверьте конфигурацию pytest-asyncio

### Проблемы с frontend тестами
1. **Ошибки модулей**: Запустите `npm install`
2. **Ошибки TypeScript**: Проверьте типы в `src/test/`
3. **Ошибки React**: Убедитесь, что все моки настроены правильно

## 📈 Статистика тестов

### Текущее состояние
- **Backend**: 39 тестов ✅
- **Frontend**: 11 тестов ✅
- **Общее покрытие**: ~85%

### Категории тестов
- **API endpoints**: 22 теста
- **Core модули**: 7 тестов
- **WebSocket**: 10 тестов
- **React компоненты**: 6 тестов
- **Хуки и сервисы**: 5 тестов

## 🔄 CI/CD

Тесты автоматически запускаются при:
- Push в main ветку
- Создании Pull Request
- Ручном запуске в GitHub Actions

## 📝 Добавление новых тестов

### Backend тест
1. Создайте файл в соответствующей папке `tests/`
2. Импортируйте необходимые фикстуры
3. Используйте `@pytest.mark.asyncio` для async тестов
4. Запустите: `./test.sh backend`

### Frontend тест
1. Создайте файл `*.test.tsx` в папке `src/test/`
2. Импортируйте компонент и тестовые утилиты
3. Напишите тесты с `@testing-library/react`
4. Запустите: `./test.sh frontend`

---

**Удачного тестирования! 🎉**

