const btn = document.querySelector(".container i")

btn.addEventListener('click', () => {
    if (btn.parentNode.classList.contains("close")) {
        btn.parentNode.classList.remove("close");
        btn.classList.remove("icon-liebiao");
        btn.classList.add("icon-cuowu")
    } else {
        btn.parentNode.classList.add("close");
        btn.classList.remove("icon-cuowu");
        btn.classList.add("icon-liebiao")
    }
})