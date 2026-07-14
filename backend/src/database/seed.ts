import db from './pool';

export function seedDemoData() {
  console.log('Seeding demo data...');

  // 创建示例球队
  const teamA = db.prepare(
    "INSERT INTO teams (name, logo_url) VALUES (?, ?)"
  ).run('湖人队', '');
  const teamB = db.prepare(
    "INSERT INTO teams (name, logo_url) VALUES (?, ?)"
  ).run('勇士队', '');

  const homeTeamId = Number(teamA.lastInsertRowid);
  const awayTeamId = Number(teamB.lastInsertRowid);

  // 创建示例球员
  const homePlayers = [
    { name: '詹姆斯', number: 23, position: 'SF' },
    { name: '戴维斯', number: 3, position: 'PF' },
    { name: '里夫斯', number: 15, position: 'SG' },
    { name: '拉塞尔', number: 1, position: 'PG' },
    { name: '海斯', number: 10, position: 'C' },
    { name: '克内克特', number: 0, position: 'SG' },
    { name: '普林斯', number: 11, position: 'SF' },
    { name: '丁威迪', number: 6, position: 'PG' },
    { name: '八村垒', number: 7, position: 'PF' },
    { name: '雷迪什', number: 4, position: 'SF' },
    { name: '沃伦', number: 2, position: 'PF' },
    { name: '芬尼-史密斯', number: 8, position: 'SF' },
  ];

  const awayPlayers = [
    { name: '库里', number: 30, position: 'PG' },
    { name: '汤普森', number: 11, position: 'SG' },
    { name: '威金斯', number: 22, position: 'SF' },
    { name: '格林', number: 23, position: 'PF' },
    { name: '卢尼', number: 5, position: 'C' },
    { name: '波杰姆斯基', number: 0, position: 'PG' },
    { name: '穆迪', number: 4, position: 'SG' },
    { name: '巴特勒', number: 23, position: 'SF' },
    { name: '特雷斯', number: 33, position: 'PF' },
    { name: '林书豪', number: 7, position: 'PG' },
    { name: '保尔特斯', number: 14, position: 'C' },
    { name: '席菲诺', number: 10, position: 'SG' },
  ];

  const insertPlayer = db.prepare(
    "INSERT INTO players (team_id, name, number, position) VALUES (?, ?, ?, ?)"
  );

  const allPlayers: any[] = [];

  for (const p of homePlayers) {
    const r = insertPlayer.run(homeTeamId, p.name, p.number, p.position);
    allPlayers.push({ id: Number(r.lastInsertRowid), ...p });
  }
  for (const p of awayPlayers) {
    const r = insertPlayer.run(awayTeamId, p.name, p.number, p.position);
    allPlayers.push({ id: Number(r.lastInsertRowid), ...p });
  }

  // 创建示例比赛
  const match = db.prepare(
    `INSERT INTO matches (home_team_id, away_team_id, status, start_time, venue) 
     VALUES (?, ?, ?, ?, ?)`
  ).run(homeTeamId, awayTeamId, 'pending', new Date().toISOString(), '洛杉矶斯台普斯中心');
  const matchId = Number(match.lastInsertRowid);

  // 设置上场名单
  const insertMatchPlayer = db.prepare(
    "INSERT OR IGNORE INTO match_players (match_id, player_id, is_starting) VALUES (?, ?, ?)"
  );

  for (const player of allPlayers) {
    insertMatchPlayer.run(matchId, player.id, player.number <= 5 ? 1 : 0);
  }

  console.log(`✅ Seeded demo data: 湖人 vs 勇士, match: ${matchId}`);
  console.log(`   主队: ${homePlayers.length} 球员`);
  console.log(`   客队: ${awayPlayers.length} 球员`);
}