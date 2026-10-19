/**
 * Init
 * Author: Taigo Ito (https://qwel.design/)
 * Location: Fukui, Japan
 * @package Discover Echizen
 */

// Fader
import Fader from './_fader.js';
const fader = document.querySelectorAll('.fader');
fader.forEach((elem) => {
  new Fader(elem);
});

// Format Title
import FormatTitle from './_formatTitle.js';
new FormatTitle();

// Island
import Island from './_island.js';
const islands = document.querySelectorAll('.discoverMap__island');
islands.forEach((elem, i) => {
  new Island(elem);
});

// Wave
import Wave from './_wave.js';
const sections = document.querySelectorAll('.wave');
sections.forEach((elem, i) => {
  new Wave(elem);
});

// Embedded
import Embed from './_embed.js';
new Embed();

// Gallery
import Gallery from './_gallery.js';
const gallery = document.querySelectorAll('.gallery');
gallery.forEach((elem) => {
  new Gallery(elem);
});

// Modal
import Modal from './_modal.js';
new Modal();

// School Excursion
// Accordion
import Accordion from './_accordion.js';
new Accordion();

// Action Core (新サイトと共通のモジュール)
// ReadableOnScroll: 画面に入った要素をふわっと表示する
// 対象は .--readable (ブロックの「追加 CSS クラス」で付ける) と [data-readable]
// 縦に長い要素でも必ず表示されるよう, 要素の上端が画面に入った時点で判定する (threshold: 0)
// JS が動かないときは隠さないよう, html に has-readable を付けたときだけ CSS で隠す
import ActionCore from './_actionCore.js';
document.documentElement.classList.add('has-readable');
new ActionCore.ReadableOnScroll({
  readableSelector: '.--readable, [data-readable]',
  threshold: 0,
});

// 沿革の年表 (/about-us/. 新サイトと共通のモジュール)
import HistoryTimeline from './_historyTimeline.js';
document.querySelectorAll('[data-history]').forEach((elem) => {
  new HistoryTimeline(elem);
});
