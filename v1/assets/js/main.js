/*================================================
*
* Table of Contents :
* 1. Total Year
* 2. Animation on scroll function and init
*
================================================*/

/*===============================================
  1. Total Year
===============================================*/

function TotalYears() {
  const startYear = 2019;
  const currentYear = new Date().getFullYear();
  const yearDifference = currentYear - startYear + 1;

  document.getElementById("years").textContent = `${yearDifference}+`;
}
window.onload = TotalYears;

/*===============================================
  2. Animation on scroll function and init
===============================================*/

function aosInit() {
  AOS.init({
    duration: 600,
    easing: "ease-in-out",
    once: true,
    mirror: false,
  });
}
window.addEventListener("load", aosInit);