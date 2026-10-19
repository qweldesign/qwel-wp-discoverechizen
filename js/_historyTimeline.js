/**
 * History Timeline
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * 沿革の年表を, スクロール位置に合わせて動かす
 * ReadableOnScroll の「見えたら出す (0 か 1)」を進めて, 進み具合 (0〜1) を CSS 変数に書き込む
 * 見た目は CSS 側で, この値から決める (スクロールを戻すと動きも戻る)
 *
 * 使い方:
 * 年表全体に [data-history], 各年に [data-history-item] と data-year 属性,
 * 年の中の見出し・本文・写真の組に [data-history-entry],
 * 今の年を表示する要素に [data-history-year] 属性を付与する
 *
 * 書き込む値:
 * --history-progress (年表全体): 画面の中央が年表のどこまで進んだか. 縦の線の満ち具合に使う
 * --item-progress (各年・各組): 上端が画面の下から中央まで進んだか. 年号が出る・写真が開く・文章が出るのに使う
 * .is-passed (各年): 画面の中央を過ぎた年 (線上の点を塗る)
 * .is-animated (年表全体): JS が動いている印 (付いていなければ CSS は最初から全部表示する)
 *
 * 背景の海 ([data-history-sea] の canvas があれば):
 * 年表を読み進めるほど, 画面の下の方にあった薄い水色の波が上がってくる (潮が満ちる)
 * 年表が画面に入っている間だけ描き, 外れたら止める
 */
export default class HistoryTimeline {
  constructor(elem) {
    this.elem = elem;
    this.items = Array.from(elem.querySelectorAll('[data-history-item]'));
    this.entries = Array.from(elem.querySelectorAll('[data-history-entry]'));
    this.yearElem = elem.querySelector('[data-history-year]');
    if (!this.items.length) return;

    // 動きを減らす設定では何もしない (CSS の既定で全部表示)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.ticking = false;
    this.onScroll = this.onScroll.bind(this);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });

    this.elem.classList.add('is-animated');

    // 背景の海
    const canvas = elem.querySelector('[data-history-sea]');
    if (canvas) this.sea = new Sea(canvas);

    this.update();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  update() {
    const vh = window.innerHeight;
    const center = vh * 0.5;

    // 年表全体: 画面の中央が年表の上端から下端までのどこにあるか
    const rect = this.elem.getBoundingClientRect();
    const progress = clamp((center - rect.top) / rect.height);
    this.elem.style.setProperty('--history-progress', progress.toFixed(4));
    this.sea?.setProgress(progress, rect.bottom > 0 && rect.top < vh);

    // 各年: 上端が画面の下端 (0) から中央 (1) まで進んだか
    let current = this.items[0];
    this.items.forEach((item) => {
      const top = item.getBoundingClientRect().top;
      const itemProgress = clamp((vh - top) / (vh - center));
      item.style.setProperty('--item-progress', itemProgress.toFixed(4));

      const passed = top < center;
      item.classList.toggle('is-passed', passed);
      if (passed) current = item;
    });

    // 各組 (見出し・本文・写真): 年と同じ測り方で, 組ごとに出す
    this.entries.forEach((entry) => {
      const top = entry.getBoundingClientRect().top;
      entry.style.setProperty('--item-progress', clamp((vh - top) / (vh - center)).toFixed(4));
    });

    // 今の年の表示を切り替える (変わったときだけ, 切り替えのアニメーションをやり直す)
    const year = current.dataset.year;
    if (this.yearElem && this.yearElem.textContent !== year) {
      this.yearElem.textContent = year;
      this.yearElem.classList.remove('is-changed');
      void this.yearElem.offsetWidth; // アニメーションを最初から再生させる
      this.yearElem.classList.add('is-changed');
    }
  }

  destroy() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    this.sea?.destroy();
  }
}

/**
 * 背景の海 (canvas)
 * 3枚の波を重ねて描き, 水面の高さを年表の進み具合で上げる
 * progress 0: 水面は画面の下の方 / progress 1: 画面の上の方まで満ちる
 * 満ちるにつれて, 色も少しずつ濃くする (本文の文字が読みにくくならない範囲で)
 */
class Sea {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    // 水面の高さ (画面の上からの割合). progress に合わせて start から end へ上がる
    this.levelStart = 0.95;
    this.levelEnd = 0.15;
    this.level = this.levelStart; // 実際に描く高さ (目標へなめらかに近づける)
    this.target = this.levelStart;

    // 波 (奥から手前の順). amplitude: 振れ幅(px) / length: 波長(px) / speed: 流れる速さ / alpha: 濃さ / offset: 水面からのずれ(px)
    this.waves = [
      { amplitude: 18, length: 900, speed: 0.00018, alpha: 0.10, offset: -18 },
      { amplitude: 12, length: 620, speed: -0.00026, alpha: 0.10, offset: 0 },
      { amplitude: 8,  length: 420, speed: 0.00034, alpha: 0.12, offset: 14 },
    ];
    this.color = '55, 190, 240'; // primary (#37bef0)

    // 色の濃さの倍率 (満ち始め → 満ちきったとき)
    // 1.8 倍で, 3枚が重なった一番濃いところでも本文の黒い文字とのコントラストは 10:1 以上を保つ
    this.depthStart = 1;
    this.depthEnd = 3.6; // 推奨倍率の2倍

    this.isVisible = false;
    this.frame = null;
    this.draw = this.draw.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 年表の進み具合 (0〜1) と, 年表が画面に入っているか
  setProgress(progress, isVisible) {
    this.target = this.levelStart + (this.levelEnd - this.levelStart) * progress;
    this.canvas.classList.toggle('is-visible', isVisible);
    if (isVisible && !this.isVisible) this.frame = requestAnimationFrame(this.draw);
    if (!isVisible && this.frame) cancelAnimationFrame(this.frame);
    this.isVisible = isVisible;
  }

  draw(time) {
    const { ctx, width, height } = this;
    // 水面はスクロールにすぐ追従させず, 少し遅れて満ちてくるようにする
    this.level += (this.target - this.level) * 0.06;
    const surface = height * this.level;
    // 水面の高さ (0〜1 の満ち具合) から, 色の濃さを決める
    const fill = (this.levelStart - this.level) / (this.levelStart - this.levelEnd);
    const depth = this.depthStart + (this.depthEnd - this.depthStart) * Math.min(1, Math.max(0, fill));

    ctx.clearRect(0, 0, width, height);
    for (const wave of this.waves) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width + 20; x += 20) {
        const phase = (x / wave.length) * Math.PI * 2 + time * wave.speed * Math.PI * 2;
        const y = surface + wave.offset + Math.sin(phase) * wave.amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = `rgba(${this.color}, ${(wave.alpha * depth).toFixed(3)})`;
      ctx.fill();
    }

    if (this.isVisible) this.frame = requestAnimationFrame(this.draw);
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
