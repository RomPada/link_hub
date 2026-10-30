/** Client-side language option for the private admin, English remains default. */
const lexicon = {
  'View details':'Переглянути деталі','Analytics period':'Період аналітики',
  'Overview':'Огляд','My links':'Мої посилання','Traffic sources':'Джерела трафіку','Appearance':'Оформлення',
  'WORKSPACE':'РОБОЧИЙ ПРОСТІР','PERSONAL CONTROL CENTER':'ПАНЕЛЬ КЕРУВАННЯ','View public page':'Переглянути публічну сторінку','Sign out':'Вийти',
  'Open page':'Відкрити сторінку','LIVE':'ОНЛАЙН','A CLEARER PICTURE OF YOUR TRAFFIC':'АНАЛІТИКА ТВОГО ТРАФІКУ',
  'Know where visitors arrive and what they choose next.':'Дивись, звідки приходять відвідувачі та які ресурси вони обирають.',
  'Today':'Сьогодні','Yesterday':'Вчора','7 days':'7 днів','This month':'Цей місяць','All time':'Увесь час',
  'Page views':'Перегляди сторінки','Unique visitors':'Унікальні відвідувачі','Outbound clicks':'Вихідні кліки','Click-through rate':'CTR',
  'Visits to your LinkHub':'Відвідування твоєї сторінки','Distinct anonymous browser IDs':'Унікальні анонімні браузери','Clicks on your destination buttons':'Натискання на кнопки ресурсів','Outbound clicks ÷ page views':'Вихідні кліки ÷ перегляди',
  'Traffic activity':'Активність трафіку','Last 14 days · Today first · UTC':'14 днів · від сьогодні · UTC','Views':'Перегляди','Clicks':'Кліки',
  'Visits by entry link':'Переходи за вхідними адресами','SOURCE MIX':'РОЗПОДІЛ ДЖЕРЕЛ','Destination clicks':'Кліки на ресурси','Which buttons people open':'Які кнопки натискають','BUTTONS':'КНОПКИ',
  'Visitor countries':'Країни відвідувачів',"Based on Cloudflare's approximate location":'За приблизними геоданими Cloudflare','WORLDWIDE':'КРАЇНИ',
  'Recent activity':'Останні події','Latest tracked views and outbound clicks':'Останні перегляди та натискання','WHEN':'КОЛИ','EVENT':'ПОДІЯ','ENTRY SOURCE':'ДЖЕРЕЛО','DESTINATION':'РЕСУРС','COUNTRY':'КРАЇНА','VISITOR':'ВІДВІДУВАЧ',
  'Page view':'Перегляд','Outbound click':'Вихідний клік','Unknown':'Невідомо','Direct':'Прямий','No activity in this period yet.':'За цей період подій немає.','Your first visit will appear here.':'Перший візит зʼявиться тут.',
  'YOUR DESTINATIONS':'ТВОЇ РЕСУРСИ','These are the buttons visitors see on your public page.':'Ці кнопки відвідувачі бачать на твоїй сторінці.',
  '+ Add a link':'+ Додати посилання','Two separate metrics.':'Дві окремі метрики.','Live':'Активне','Hidden':'Приховане','Copy link':'Копіювати URL','Edit':'Змінити','Delete':'Видалити',
  'YOUR SOURCES':'ТВОЇ ДЖЕРЕЛА','KNOW WHERE PEOPLE COME FROM':'ЗВІДКИ ПРИХОДЯТЬ ВІДВІДУВАЧІ',
  '+ Add a source':'+ Додати джерело','Paused':'Призупинено','Copy URL':'Копіювати URL',
  'MAKE IT YOURS':'ПЕРСОНАЛІЗУЙ СТОРІНКУ','Edit the name, message, and visual identity of your public page.':'Змінюй назву, опис та оформлення публічної сторінки.',
  'Profile details':'Налаштування профілю','Changes appear on all entry URLs immediately.':'Зміни відображаються на всіх вхідних адресах.',
  'PUBLIC PROFILE':'ПУБЛІЧНИЙ ПРОФІЛЬ','Display name':'Назва профілю','Headline':'Заголовок','Bio':'Опис','Avatar image URL':'URL зображення аватара',
  'Avatar text':'Літери аватара','Avatar background':'Фон аватара','Avatar shape':'Форма аватара','Rounded':'Заокруглений','Square':'Квадрат','Circle':'Коло',
  'Accent color':'Акцентний колір','Site favicon':'Фавікон сайту','Upload favicon':'Завантажити фавікон','Remove custom favicon':'Прибрати власний фавікон',
  'Display top brand':'Показувати логотип зверху','Display top tagline':'Показувати верхній підпис','Top-of-page elements':'Верхня панель сторінки',
  'Save appearance':'Зберегти оформлення','Add a traffic source':'Додати джерело трафіку','Edit source':'Редагувати джерело',
  'Add a destination':'Додати посилання','Edit button':'Редагувати кнопку','Source name':'Назва джерела','Short URL slug':'Коротка адреса',
  'Button icon':'Іконка кнопки','Icon mode':'Режим іконки','Image URL':'URL зображення','Upload image':'Завантажити зображення','Default arrow':'Звичайна стрілка',
  'Button title':'Назва кнопки','Description':'Опис','Destination URL':'Адреса ресурсу','Section / category':'Категорія','Card color':'Колір картки',
  'Active (accepts visits)':'Активне (рахувати відвідування)','Visible on public page':'Показувати на сторінці',
  'Cancel':'Скасувати','Create':'Створити','Save changes':'Зберегти','Delete permanently':'Видалити назавжди','Delete traffic source?':'Видалити джерело трафіку?','Delete destination button?':'Видалити кнопку?',
  'Welcome back':'З поверненням','PRIVATE WORKSPACE':'ЗАКРИТИЙ ДОСТУП','Sign in':'Увійти','Password':'Пароль','Show':'Показати','Hide':'Приховати',
  'Back to my page':'На публічну сторінку','SECURE ADMIN AREA':'ЗАХИЩЕНА ПАНЕЛЬ',
  'Nothing here yet.':'Тут поки порожньо.','Add your first destination link.':'Додай перше посилання.',
  'Copy':'Копіювати', 'Remove':'Прибрати','Appearance saved':'Оформлення збережено',
  'Start here':'Почни тут','No activity yet':'Подій ще немає',
  'optional · HTTPS':'необовʼязково · HTTPS'
};
Object.assign(lexicon, {
  'PUBLIC PROFILE':'ПУБЛІЧНИЙ ПРОФІЛЬ',
  'These are the buttons visitors see on your public page.':'Ці кнопки відображаються на твоїй сторінці.',
  'LinkHub tracks visits to your page and clicks on these buttons. Sample links are visible on the public page and lead to safe example.com addresses until replaced.':'LinkHub окремо рахує відвідування сторінки та натискання кнопок. Демопосилання видимі, але ведуть на технічні адреси example.com, доки ти їх не зміниш.',
  'Visitors open a button through a tracked':'Відвідувачі відкривають ресурс через адресу',
  "You can edit the real destination without changing the button's tracking address.":'Ти можеш змінити адресу призначення, не змінюючи трекінгове посилання.',
  'Share a different entry URL on each platform; every URL opens the same LinkHub page.':'Для кожного джерела використовуй окрему адресу. Усі вони відкривають одну й ту саму сторінку.',
  'Source attribution, not automatic referrer detection.':'Джерело визначається адресою входу, а не автоматично.',
  'A visit to':'Відвідування за адресою',
  'is attributed to Source One even if the URL is shared elsewhere. Direct visitors use the homepage.':'рахується як Source One, навіть якщо посилання переслали. Прямі відвідувачі заходять на головну.',
  'Profile avatar':'Аватар профілю',
  'Use a hosted image, or a custom letter tile when no image is provided.':'Використовуй URL зображення або власні літери, якщо зображення немає.',
  'Avatar preview':'Попередній перегляд аватара',
  'Custom favicon saved':'Власний фавікон збережено',
  'Using the default icon':'Використовується стандартний значок',
  'Default favicon will be restored on save':'Стандартний фавікон повернеться після збереження',
  'The icon is shown in browser tabs.':'Іконку видно у вкладках браузера.',
  'Upload a PNG, WebP or ICO file (up to 60 KB). The icon is shown in browser tabs.':'Завантаж PNG, WebP або ICO (до 60 КБ). Іконку видно у вкладках браузера.',
  'Control the branding and small tagline shown at the top of the public page.':'Керуй логотипом та коротким підписом угорі публічної сторінки.',
  'Tip: a short headline and a handful of curated links usually work best.':'Порада: короткий заголовок і декілька ретельно вибраних посилань сприймаються найкраще.',
  'Sign in to manage your links and traffic analytics.':'Увійди, щоб керувати посиланнями й аналітикою.',
  'Admin secrets are missing. Follow README.md to set up ADMIN_PASSWORD and SESSION_SECRET.':'Секрети адміністратора не налаштовані. Дотримуйся README.md для налаштування ADMIN_PASSWORD і SESSION_SECRET.',
  'Item created':'Запис створено','Changes saved':'Зміни збережено','Item deleted':'Запис видалено',
  'Public page updated':'Публічну сторінку оновлено','Button order saved':'Порядок кнопок збережено',
  'Copied to clipboard':'Скопійовано до буфера обміну',
  'Clipboard unavailable. Select the URL and copy it manually.':'Буфер обміну недоступний. Виділи URL і скопіюй вручну.',
  'Move up':'Вище','Move down':'Нижче',
  'DATA':'ДАНІ','Remove custom favicon':'Видалити власний фавікон',
  'Enter your password':'Введи пароль','Your page':'Твоя сторінка','Describe this resource':'Опиши ресурс',
  'Example Resource':'Приклад ресурсу','Source One':'Джерело один',
  'Create':'Створити','Edit source':'Редагувати джерело',
  'Your data, your links.':'Твої дані, твої посилання.',
  'Nothing to show yet.':'Поки немає даних.','Loading analytics…':'Завантаження аналітики…',
  'Button icon':'Іконка кнопки',
  'Automatic favicon from the destination, image URL, your own file, or the default arrow.':'Автоматичний значок ресурсу, URL зображення, власний файл або стандартна стрілка.',
  'Auto — destination favicon':'Автоматично — фавікон ресурсу',
  'Image URL':'URL зображення',
  'Upload image':'Завантажити зображення',
  'Default arrow':'Стандартна стрілка',
  'Icon mode':'Режим іконки',
  'Upload PNG, WebP or ICO (60 KB max)':'Завантаж PNG, WebP або ICO (до 60 КБ)',
  'Uses /favicon.ico from the destination website. Some websites do not provide one; the arrow is used instead.':'Використовує /favicon.ico з сайту призначення. Якщо іконки немає, буде стрілка.',
  'Provide the direct URL of an image file.':'Укажи пряму URL-адресу файлу зображення.',
  'File is stored in D1 and served by LinkHub.':'Файл зберігається в D1 та віддається через LinkHub.',
  'Use the standard arrow icon.':'Використовувати стандартну стрілку.',
  'View details':'Переглянути деталі',
  'Loading events…':'Завантаження подій…',
  'One row per anonymous browser in this period':'Один рядок на анонімний браузер за період',
  'Outbound events contributing to outbound clicks ÷ page views':'Вихідні події, які формують частку кліків від переглядів',
  'Event log for this metric':'Журнал подій для цього показника',
  'Last 7 days':'Останні 7 днів',
  'DEVICE':'ПРИСТРІЙ',
  'SOURCE':'ДЖЕРЕЛО',
  'Appearance':'Оформлення',
  'Used for highlights, link arrows, focus indicators and interactive details.':'Використовується для акцентів, стрілок, виділення фокусу й інтерактивних елементів.',
  'Unexpected error':'Неочікувана помилка'
});
const attributes=['placeholder','title','aria-label'];
function translateValue(original) {
  if (lexicon[original]) return lexicon[original];
  const match=original.match(/^([0-9]+) RECORDS$/);
  if (match) return `${match[1]} ЗАПИСІВ`;
  return original;
}
export function adminText(value, language) { return language === 'uk' ? translateValue(value) : value; }
export function getAdminLanguage() {
  try { return localStorage.getItem('linkhub_admin_lang') === 'uk' ? 'uk' : 'en'; }
  catch { return 'en'; }
}
export function translateAdmin(root, language) {
  if (language !== 'uk' || !root) return;
  const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node=walker.nextNode())) {
    if (['SCRIPT','STYLE','TEXTAREA','CODE','PRE'].includes(node.parentElement?.tagName)) continue;
    const trimmed=node.nodeValue.trim();
    if (trimmed && lexicon[trimmed]) node.nodeValue=node.nodeValue.replace(trimmed,lexicon[trimmed]);
  }
  root.querySelectorAll('*').forEach(el => {
    for(const a of attributes) if(el.hasAttribute(a)) {
      const value=el.getAttribute(a),translated=translateValue(value);
      if(value!==translated) el.setAttribute(a,translated);
    }
    if(el.tagName==='BUTTON' && el.childNodes.length === 1 && el.firstChild.nodeType===Node.TEXT_NODE) {
      const original=el.textContent.trim(); if(lexicon[original]) el.textContent=lexicon[original];
    }
  });
}
