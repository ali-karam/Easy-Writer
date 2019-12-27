/*

Primary Author: Ken Wheeler (Google) + Dawn Dean

*/


$(document).ready(function() {
$('.menu-toggle').on('click', function () {
$('.nav').toggleClass('showing');
$('.nav ul').toggleClass('showing');

});


$('.post-wrapper').slick({
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: false,
  autoplaySpeed: 2000,
  nextArrow: $('.next'),
  prevArrow: $('.prev'),
});

});
