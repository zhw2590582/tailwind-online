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

const overwrite = {
  Container: {
    name: "container",
    value: "width: 100%;",
    css: `
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}

@media (min-width: 1536px) {
  .container {
    max-width: 1536px;
  }
}    
    `,
  },
};

async function getCss(url, subcategory) {
  const find = overwrite[subcategory];
  if (find) {
    styles.push(find.css);
    return find;
  }

  const res = await fetch(`${tailwind}${url}`);
  const text = await res.text();
  const dom = new JSDOM(text);
  const document = dom.window.document;
  const $trs = [...document.querySelectorAll("#class-table tbody tr")];

  return $trs.map(({ children }) => {
    const name = children[0].textContent.trim();
    const value = children[1].textContent.trim();

    const key = name
      .replace(/\//g, "\\/")
      .replace(/\./g, "\\.")
      .replace(/%/g, "\\%");

    const val = value.replace(/\/\*.*?\*\//g, "").replace(/\n/g, " ");
    const css = overwrite[name] || `.${key} { ${val} }`;

    styles.push(css);

    return {
      name: name,
      value: val,
      css,
    };
  });
}

async function build() {
  const res = await fetch(`${tailwind}/docs/installation`);
  const text = await res.text();
  const dom = new JSDOM(text);
  const document = dom.window.document;

  const version = document.querySelector("[data-headlessui-state]").textContent;

  console.log(version);

  const preflight = await getPreflight();

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
      item.children.push({
        name: subcategory,
        url: url,
        css: await getCss(url, subcategory),
      });
    }

    data.push(item);
  }

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
