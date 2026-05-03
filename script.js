const regions = document.querySelectorAll(".region");
const info = document.getElementById("info");

regions.forEach(region => {
  region.addEventListener("click", () => {
    regions.forEach(r => r.classList.remove("active"));
    region.classList.add("active");

    info.innerHTML = `
      <h2>${region.dataset.title}</h2>
      <p>${region.dataset.info}</p>
    `;
  });
});