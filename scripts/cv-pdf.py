# Print the PDF CV from the CV page, so the two never disagree.
#   npm run build && node <any static server> dist  (served at /my-portfolio/)
#   CV_PHONE="+213 ..." python3 scripts/cv-pdf.py http://localhost:8800/my-portfolio/cv/ public/Abdelkrim-Ghebouli-CV.pdf
# The phone number is passed in at print time: it goes into the PDF and never into the page's HTML.
import asyncio, os, sys
from playwright.async_api import async_playwright

URL, OUT = sys.argv[1], sys.argv[2]
PHONE = os.environ.get('CV_PHONE', '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(URL)
        await pg.evaluate("""(ph) => {
          const li = document.querySelector('.contact .phone');
          if (ph) { li.textContent = ph; li.hidden = false; }
          document.title = 'Abdelkrim Ghebouli, CV';
          return document.fonts.ready;
        }""", PHONE)
        await pg.emulate_media(media='print')
        await pg.pdf(path=OUT, format='A4', print_background=True, prefer_css_page_size=True, tagged=True, outline=True)
        await b.close()

asyncio.run(main())
