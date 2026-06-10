const SECTIONS = [
  "overview", "markets", "getting-started", "trading", "fees",
  "risk", "oracle", "lp", "protocol", "api", "faq",
];

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "COPIED";
    btn.style.color = "#00ff41";
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = "";
    }, 1500);
  });
}

function initCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy, btn));
  });
}

function initFaq() {
  document.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const open = item.classList.toggle("open");
      btn.querySelector(".faq-icon").textContent = open ? "−" : "+";
    });
  });
}

function initNav() {
  const links = document.querySelectorAll(".docs-nav a");
  const select = document.getElementById("docs-select");

  function setActive(id) {
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
    if (select) select.value = id;
  }

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      setActive(id);
    });
  });

  if (select) {
    select.addEventListener("change", () => {
      document.getElementById(select.value)?.scrollIntoView({ behavior: "smooth" });
      setActive(select.value);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    },
    { rootMargin: "-80px 0px -70% 0px" }
  );

  SECTIONS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  initCopyButtons();
  initFaq();
  initNav();
  const connect = document.getElementById("header-connect");
  if (connect) {
    connect.addEventListener("click", () => showToast("Demo mode — wallet connect disabled"));
  }
});
