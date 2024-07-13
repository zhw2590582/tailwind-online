import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

const tailwind = "https://tailwindcss.com";
const preflight = "https://unpkg.com/tailwindcss/src/css/preflight.css";

const excludes = [
  "Getting Started",
  "Core Concepts",
  "Customization",
  "Base Styles",
  "Official Plugins",
];

const styles = [];

async function getPreflight() {
  const res = await fetch(preflight);
  const text = await res.text();
  styles.push(text);
  return text;
}

async function getCss(url) {
  const res = await fetch(`${tailwind}${url}`);
  const text = await res.text();
  const dom = new JSDOM(text);
  const document = dom.window.document;
  const $trs = [...document.querySelectorAll("#class-table tbody tr")];
  return $trs.map((style) => {
    const [name, value] = style.children;
    const key = name.textContent.trim();
    const val = value.textContent.trim().replace(/\/\*.*?\*\//g, "");
    const css = `.${key} { ${val} }`;
    styles.push(css);
    return { name: key, value: val, css };
  });
}

async function build() {
  const res = await fetch(`${tailwind}/docs/installation`);
  const text = await res.text();
  const dom = new JSDOM(text);
  const document = dom.window.document;

  const version = document.querySelector("[data-headlessui-state]").textContent;

  const $categories = [...document.querySelectorAll("#nav h5")].filter(
    (category) => !excludes.includes(category.textContent.trim())
  );

  const categories = $categories.map((category) => category.textContent.trim());
  console.log(categories);

  const data = [];

  for (let i = 0; i < $categories.length; i++) {
    const $category = $categories[i];
    const $subcategory = $category.nextElementSibling;
    const category = $category.textContent.trim();
    const $links = [...$subcategory.querySelectorAll("a")];
    const item = { name: category, children: [] };

    for (let j = 0; j < $links.length; j++) {
      const link = $links[j];
      const url = link.getAttribute("href");
      const subcategory = link.textContent.trim();
      console.log(subcategory);
      const css = await getCss(url);
      console.log(css);
      item.children.push({
        name: subcategory,
        url: url,
        css: css,
      });
    }

    data.push(item);
  }

  const preflight = await getPreflight();

  fs.writeFileSync(
    path.resolve("./tailwind.json"),
    JSON.stringify(
      {
        version,
        time: Date.now(),
        preflight,
        data,
      },
      null,
      2
    )
  );

  fs.writeFileSync(path.resolve("./tailwind.css"), styles.join("\n"));
}

build();
