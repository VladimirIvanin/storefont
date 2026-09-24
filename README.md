# storefont — insales-icons

Генератор иконочных шрифтов для магазинов на платформе InSales. Собирает
шрифт из трёх бесплатных наборов SVG-иконок; у всех сборок один и тот же API:

- семейство шрифта: `insales-icons`
- классы: `.icon-<имя>` (через `::before`)
- CSS-переменные: `--icon-code-<имя>`

**Демо:** https://vladimirivanin.github.io/storefont/

## Наборы

| Папка | Источник | Лицензия | Стиль |
| --- | --- | --- | --- |
| `fonts/icons-bootstrap/` | [Bootstrap Icons](https://icons.getbootstrap.com/) | MIT | чистый и дружелюбный |
| `fonts/icons-remix/` | [Remix Icon](https://remixicon.com/) | Apache-2.0 | геометрический лайн |
| `fonts/icons-phosphor/` | [Phosphor Icons](https://phosphoricons.com/) | MIT | классический контур |

Все сборки содержат одинаковый набор из 83 иконок, поэтому смена набора
не требует правок разметки — меняется только подключаемый CSS.

## Использование

Подключите один CSS-файл (грузить одновременно можно только один):

```html
<link rel="stylesheet" href="https://vladimirivanin.github.io/storefont/fonts/icons-bootstrap/style.css">

<i class="icon-cart"></i>
```

Либо используйте CSS-переменные напрямую:

```css
.icon-cart::before {
  content: var(--icon-code-cart);
  font-family: "insales-icons";
}
```

Полный список иконок с поиском — на демо-странице.

## Разработка

Исходные SVG берутся из npm-пакетов при сборке, так что обновление иконок —
обычный `npm update`.

```bash
npm install
npm run fonts   # генерация всех трёх шрифтов в fonts/
npm run dev     # демо-страница с live reload
npm run build   # пересборка корневого index.html из demo/
npm run preview # запуск собранного сайта
npm run lint    # ESLint
```

### Сборка из папки с SVG

Можно собрать шрифт из любой папки с `.svg`-файлами: имя файла становится
именем глифа и классом `.icon-<имя>`, кодовые точки раздаются по алфавиту
с `0xE800`, результат кладётся в `fonts/icons-<имя-папки>/`:

```bash
npm run fonts -- --dir ./my-icons          # одна папка
npm run fonts -- --dir ./line --dir ./fill # несколько папок
npm run fonts -- --help                    # все опции
```

Имена файлов должны быть пригодны для CSS-классов (буквы, цифры, `-`, `_`).

- [config/icons.mjs](config/icons.mjs) — манифест: имена, порядок кодовых
  точек, сопоставление SVG. Единственный файл для правки при добавлении
  иконки или нового набора.
- [scripts/build-fonts.mjs](scripts/build-fonts.mjs) — сборка на основе
  [fantasticon](https://github.com/tancredi/fantasticon).

### Тестирование без сервера

В корне репозитория лежат готовые артефакты: `index.html` — собранная
демо-страница (все JS и CSS инлайн через `vite-plugin-singlefile`) и `fonts/`
со шрифтами. Достаточно открыть `index.html` двойным кликом — всё работает
через `file://`. Исходники демо лежат в `demo/` (`npm run dev` для
разработки), `npm run build` пересобирает корневой `index.html`.

Эти артефакты — источник истины: экшены ничего не собирают, а только
публикуют уже закоммиченное. Это сознательно — у GitHub Actions есть лимиты,
и релиз или деплой не должны от них зависеть. После изменения иконок не
забудьте пересобрать и закоммитить: `npm run build`.

### Деплой и релизы

- Пуш в `main` публикует `index.html` + `fonts/` на GitHub Pages как есть
  ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) — без сборки.
- Пуш тега `v*` (например `git tag v1.0.0 && git push --tags`) упаковывает
  `fonts/` в zip-архивы и прикладывает их к GitHub Release
  ([.github/workflows/release.yml](.github/workflows/release.yml)) — по одному
  на набор (`insales-icons-bootstrap-v1.0.0.zip`, `…-remix-…`, `…-phosphor-…`).
  Внутри архива — папка `icons-<набор>/` с файлами шрифта, `style.css` и
  LICENSE. Тоже без сборки: даже при исчерпанных лимитах Actions релиз
  сводится к упаковке уже закоммиченных файлов.

## Лицензии

- Код генератора и демо: [MIT](LICENSE)
- Bootstrap Icons: MIT — © The Bootstrap Authors
- Remix Icon: Apache-2.0 — © Remix Design
- Phosphor Icons: MIT — © Phosphor Icons
