#!/bin/bash

# Mukit Project Test Runner
# Скрипт для запуска тестов фронтенда и бэкенда

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода заголовков
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Функция для вывода успеха
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода ошибки
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Функция для вывода предупреждения
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Функция для проверки существования команды
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Функция для проверки виртуального окружения
check_venv() {
    if [ ! -d "venv" ]; then
        print_error "Виртуальное окружение не найдено!"
        print_warning "Запустите: make setup-backend"
        exit 1
    fi
}

# Функция для проверки node_modules
check_node_modules() {
    if [ ! -d "frontend/node_modules" ]; then
        print_error "Node modules не найдены!"
        print_warning "Запустите: make setup-frontend"
        exit 1
    fi
}

# Функция для запуска backend тестов
run_backend_tests() {
    print_header "Запуск Backend тестов"
    
    check_venv
    
    cd backend
    
    # Активируем виртуальное окружение
    source ../venv/bin/activate
    
    # Проверяем зависимости
    if ! command_exists python; then
        print_error "Python не найден!"
        exit 1
    fi
    
    # Запускаем тесты
    echo "Запуск pytest..."
    if python -m pytest tests/ -v --tb=short; then
        print_success "Backend тесты прошли успешно!"
        BACKEND_EXIT_CODE=0
    else
        print_error "Backend тесты завершились с ошибками!"
        BACKEND_EXIT_CODE=1
    fi
    
    cd ..
}

# Функция для запуска frontend тестов
run_frontend_tests() {
    print_header "Запуск Frontend тестов"
    
    check_node_modules
    
    cd frontend
    
    # Проверяем зависимости
    if ! command_exists npm; then
        print_error "npm не найден!"
        exit 1
    fi
    
    # Запускаем тесты
    echo "Запуск Vitest..."
    if npm run test:run; then
        print_success "Frontend тесты прошли успешно!"
        FRONTEND_EXIT_CODE=0
    else
        print_error "Frontend тесты завершились с ошибками!"
        FRONTEND_EXIT_CODE=1
    fi
    
    cd ..
}

# Функция для запуска тестов с покрытием
run_tests_with_coverage() {
    print_header "Запуск тестов с покрытием кода"
    
    # Backend тесты с покрытием
    print_header "Backend тесты с покрытием"
    check_venv
    cd backend
    source ../venv/bin/activate
    
    if python -m pytest tests/ --cov=app --cov-report=html --cov-report=term --cov-report=xml; then
        print_success "Backend тесты с покрытием прошли успешно!"
        BACKEND_EXIT_CODE=0
    else
        print_error "Backend тесты с покрытием завершились с ошибками!"
        BACKEND_EXIT_CODE=1
    fi
    
    cd ..
    
    # Frontend тесты с покрытием
    print_header "Frontend тесты с покрытием"
    check_node_modules
    cd frontend
    
    if npm run test:run -- --coverage; then
        print_success "Frontend тесты с покрытием прошли успешно!"
        FRONTEND_EXIT_CODE=0
    else
        print_error "Frontend тесты с покрытием завершились с ошибками!"
        FRONTEND_EXIT_CODE=1
    fi
    
    cd ..
}

# Функция для показа справки
show_help() {
    echo "Mukit Project Test Runner"
    echo ""
    echo "Использование: $0 [ОПЦИЯ]"
    echo ""
    echo "ОПЦИИ:"
    echo "  backend     Запустить только backend тесты"
    echo "  frontend    Запустить только frontend тесты"
    echo "  coverage    Запустить тесты с покрытием кода"
    echo "  all         Запустить все тесты (по умолчанию)"
    echo "  help        Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0                    # Запустить все тесты"
    echo "  $0 backend            # Только backend тесты"
    echo "  $0 frontend           # Только frontend тесты"
    echo "  $0 coverage           # Тесты с покрытием"
}

# Основная функция
main() {
    # Инициализация переменных
    BACKEND_EXIT_CODE=0
    FRONTEND_EXIT_CODE=0
    TOTAL_TESTS=0
    PASSED_TESTS=0
    
    # Обработка аргументов
    case "${1:-all}" in
        "backend")
            run_backend_tests
            TOTAL_TESTS=1
            if [ $BACKEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=1
            fi
            ;;
        "frontend")
            run_frontend_tests
            TOTAL_TESTS=1
            if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=1
            fi
            ;;
        "coverage")
            run_tests_with_coverage
            TOTAL_TESTS=2
            if [ $BACKEND_EXIT_CODE -eq 0 ] && [ $FRONTEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=2
            elif [ $BACKEND_EXIT_CODE -eq 0 ] || [ $FRONTEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=1
            fi
            ;;
        "all")
            run_backend_tests
            run_frontend_tests
            TOTAL_TESTS=2
            if [ $BACKEND_EXIT_CODE -eq 0 ] && [ $FRONTEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=2
            elif [ $BACKEND_EXIT_CODE -eq 0 ] || [ $FRONTEND_EXIT_CODE -eq 0 ]; then
                PASSED_TESTS=1
            fi
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            print_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
    
    # Итоговый отчет
    print_header "Итоговый отчет"
    
    if [ $TOTAL_TESTS -eq $PASSED_TESTS ]; then
        print_success "Все тесты прошли успешно! ($PASSED_TESTS/$TOTAL_TESTS)"
        echo -e "${GREEN}🎉 Отличная работа!${NC}"
        exit 0
    else
        print_error "Некоторые тесты завершились с ошибками! ($PASSED_TESTS/$TOTAL_TESTS)"
        echo -e "${RED}💥 Требуется исправление ошибок${NC}"
        exit 1
    fi
}

# Запуск основной функции
main "$@"

