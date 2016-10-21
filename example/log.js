module.exports = function(...args) {
  const elem = document.createElement("pre");
  elem.textContent = [...args].join(" ");
  document.body.appendChild(elem);
};

