import test from 'node:test';
import assert from 'node:assert/strict';
import { detectUpfrontSearchIntent } from './clientSearchService.js';

test('detectUpfrontSearchIntent returns null for casual chat and greetings', () => {
  assert.equal(detectUpfrontSearchIntent('halo'), null);
  assert.equal(detectUpfrontSearchIntent('hai deepernova'), null);
  assert.equal(detectUpfrontSearchIntent('apa kabar bro'), null);
  assert.equal(detectUpfrontSearchIntent('kamu siapa?'), null);
  assert.equal(detectUpfrontSearchIntent('lagi apa nih'), null);
  assert.equal(detectUpfrontSearchIntent('terima kasih banyak ya'), null);
});

test('detectUpfrontSearchIntent returns null for code, math, and creative requests', () => {
  assert.equal(detectUpfrontSearchIntent('buatkan fungsi python untuk merge dua list'), null);
  assert.equal(detectUpfrontSearchIntent('kenapa error undefined is not a function?'), null);
  assert.equal(detectUpfrontSearchIntent('hitung 125 * 45 / 3'), null);
  assert.equal(detectUpfrontSearchIntent('buatkan puisi tentang keindahan pantai'), null);
  assert.equal(detectUpfrontSearchIntent('tulis cerita fiksi tentang astronot'), null);
});

test('detectUpfrontSearchIntent returns search intent for explicit search commands', () => {
  const res1 = detectUpfrontSearchIntent('coba cari di internet berita gempa hari ini');
  assert.ok(res1);
  assert.equal(res1.shouldSearch, true);
  assert.equal(res1.searchQuery, 'berita gempa hari ini');

  const res2 = detectUpfrontSearchIntent('tolong carikan harga emas hari ini dong');
  assert.ok(res2);
  assert.equal(res2.shouldSearch, true);
  assert.equal(res2.searchQuery, 'harga emas hari ini');

  const res3 = detectUpfrontSearchIntent('googling jadwal persib bandung');
  assert.ok(res3);
  assert.equal(res3.shouldSearch, true);
  assert.equal(res3.searchQuery, 'jadwal persib bandung');
});

test('detectUpfrontSearchIntent returns search intent for news, prices, weather, sports', () => {
  const newsRes = detectUpfrontSearchIntent('berita terbaru timnas indonesia');
  assert.ok(newsRes);
  assert.equal(newsRes.shouldSearch, true);

  const priceRes = detectUpfrontSearchIntent('harga btc hari ini berapa');
  assert.ok(priceRes);
  assert.equal(priceRes.shouldSearch, true);

  const weatherRes = detectUpfrontSearchIntent('cuaca di jakarta hari ini');
  assert.ok(weatherRes);
  assert.equal(weatherRes.shouldSearch, true);

  const sportsRes = detectUpfrontSearchIntent('jadwal pertandingan bola malam ini');
  assert.ok(sportsRes);
  assert.equal(sportsRes.shouldSearch, true);

  const winnerRes = detectUpfrontSearchIntent('siapa juara piala dunia 2022');
  assert.ok(winnerRes);
  assert.equal(winnerRes.shouldSearch, true);
});
