declare module "*.css" {
  const content: string;
  export default content;
}

// Vite only hands back the compiled stylesheet as a string when the specifier carries `?inline`;
// without the suffix it would emit a separate CSS file and break the `adoptedStyleSheets` injection.
declare module "*.css?inline" {
  const content: string;
  export default content;
}
