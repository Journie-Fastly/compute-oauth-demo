// Injects styles and props into the given template.
export default function processView(template, props) {
  for (let key in props) {
    template = template.replace(
      new RegExp(`{{\\s?${key}\\s?}}`, "g"),
      props[key]
    );
  }
  return template;
}
