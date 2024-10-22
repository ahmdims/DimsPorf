/*================================================
*
* Table of Contents :
* 1. Total Year
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
