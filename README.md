# Похожий на SQL язык для обработки json

## Встроенные функции для работы со строками
    row_number():string - Возыращает номер строки
    trim(s: string): string -  Удаляет пробелы (или другие символы) с начала и конца строки
    concat(..args: string): string - Обьеденяет строки 
    strlen(s: string): string - Длинна строки
    contains(s: string, e: string): bool - Проверяет содержит ли строка подстроку
    starts_with(s: string, e: string): bool - Проверяет начинается ли строка с подстроки
    ends_with(s: string, e: string): bool - Проверяет завершается ли строка с подстроки
    date(): string - Возвращает дату

## Для работы с данными
    csv(path: string): array  - Читает содержимое из csv
    json(path: string): array - Читает содержимое из json
    files(path: string): array - Фозвращает список файлов

