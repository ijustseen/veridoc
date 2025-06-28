# Тестирование смарт-контрактов VeriDoc в Remix IDE

## Обзор тестов

Проект содержит следующие тестовые файлы для Remix IDE:

1. **DocumentRegistry_test.sol** - Тесты для основного контракта управления документами
2. **SignatureManager_test.sol** - Тесты для управления подписями
3. **DocumentAccessControl_test.sol** - Тесты для управления доступом
4. **Integration_test.sol** - Интеграционные тесты всех контрактов

## Как запустить тесты в Remix IDE

### 1. Подготовка
1. Откройте [Remix IDE](https://remix.ethereum.org/)
2. Создайте новый проект или откройте существующий
3. Загрузите все файлы контрактов в папку `contracts/`

### 2. Структура файлов в Remix
```
contracts/
├── documents/
│   └── DocumentRegistry.sol
├── signatures/
│   └── SignatureManager.sol
├── access/
│   └── DocumentAccessControl.sol
└── test/
    ├── DocumentRegistry_test.sol
    ├── SignatureManager_test.sol
    ├── DocumentAccessControl_test.sol
    └── Integration_test.sol
```

### 3. Запуск тестов
1. Перейдите на вкладку **Solidity Unit Testing**
2. Выберите тестовый файл из выпадающего списка
3. Нажмите **Run** для запуска всех тестов
4. Или выберите конкретный тест и нажмите **Run** для запуска отдельного теста

## Описание тестов

### DocumentRegistry_test.sol
- `testDocumentCreation()` - Создание документа
- `testInvalidDocumentHash()` - Проверка валидации хеша документа
- `testSignatureRequest()` - Запрос подписи
- `testSelfSignatureRequest()` - Проверка запрета запроса подписи у самого себя
- `testDocumentSigning()` - Подписание документа
- `testDocumentTransfer()` - Передача документа
- `testDocumentDeactivation()` - Деактивация документа
- `testDocumentCount()` - Подсчет документов

### SignatureManager_test.sol
- `testSignatureManagerDeployment()` - Проверка деплоя контракта
- `testAddSignature()` - Добавление подписи
- `testDuplicateSignature()` - Проверка дублирования подписей
- `testInvalidSignatureHash()` - Проверка валидации хеша подписи
- `testSignatureInvalidation()` - Инвалидация подписи
- `testDocumentSignatureStatus()` - Статус подписей документа
- `testGetDocumentSignatures()` - Получение всех подписей
- `testIsDocumentFullySigned()` - Проверка полной подписи

### DocumentAccessControl_test.sol
- `testAccessControlDeployment()` - Проверка деплоя контракта
- `testGrantAccess()` - Предоставление доступа
- `testGrantAccessWithInvalidUser()` - Проверка валидации пользователя
- `testGrantAccessWithPastExpiration()` - Проверка срока действия
- `testHasDocumentAccess()` - Проверка прав доступа
- `testRevokeAccess()` - Отзыв доступа
- `testRevokeNonExistentAccess()` - Отзыв несуществующего доступа
- `testGetDocumentUsers()` - Получение пользователей с доступом
- `testCheckAccessExpiration()` - Проверка истечения срока
- `testAccessExpiration()` - Тест истечения доступа

### Integration_test.sol
- `testCompleteDocumentWorkflow()` - Полный рабочий процесс документа
- `testDocumentTransferWithAccessControl()` - Передача с контролем доступа
- `testAccessExpirationWorkflow()` - Рабочий процесс истечения доступа
- `testMultiSignatureWorkflow()` - Мульти-подпись
- `testDocumentDeactivation()` - Деактивация документа

## Особенности тестирования

### Использование аккаунтов
Тесты используют встроенные аккаунты Remix:
- `TestsAccounts.getAccount(0)` - владелец контракта
- `TestsAccounts.getAccount(1)` - пользователь 1
- `TestsAccounts.getAccount(2)` - пользователь 2
- `TestsAccounts.getAccount(3)` - пользователь 3

### Контекст транзакций
Для тестирования функций с разными пользователями используйте:
```solidity
/// #sender: account-1
function testWithUser1() public {
    // Тест будет выполнен от имени account-1
}
```

### Обработка ошибок
Тесты используют try-catch для проверки ошибок:
```solidity
try contract.functionThatShouldFail() {
    Assert.ok(false, "Should have failed");
} catch Error(string memory reason) {
    Assert.equal(reason, "Expected error message", "Correct error");
}
```

## Результаты тестирования

После запуска тестов вы увидите:
- ✅ Зеленые галочки для успешных тестов
- ❌ Красные крестики для неудачных тестов
- Подробные сообщения об ошибках

## Отладка

Если тесты не проходят:
1. Проверьте, что все контракты скомпилированы без ошибок
2. Убедитесь, что импорты корректны
3. Проверьте версию Solidity (должна быть >=0.4.22 <0.9.0)
4. Убедитесь, что все зависимости установлены

## Следующие шаги

После успешного тестирования в Remix:
1. Разверните контракты в тестовой сети Polygon Mumbai
2. Проведите интеграционное тестирование с фронтендом
3. Выполните аудит безопасности
4. Разверните в основной сети Polygon 