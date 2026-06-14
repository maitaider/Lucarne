-- Calendrier WC2026 : corrige les dates/heures de coup d'envoi vs le
-- vrai calendrier FIFA (vérifié sur Wikipédia par groupe — heure locale +
-- offset UTC — + recoupé par recherches ciblées ESPN/FIFA). 57 matchs.
-- L'app stocke en UTC et affiche en America/Toronto ; on fixe l'UTC exact.
-- Triggers user désactivés : correction d'horaire, pas un événement de
-- résultat (ne pas relancer annonces/notifs/règlement).

alter table ref.matches disable trigger user;

update ref.matches set kickoff_at = '2026-06-14T23:00:00+00' where match_number = 7;
update ref.matches set kickoff_at = '2026-06-15T02:00:00+00' where match_number = 9;
update ref.matches set kickoff_at = '2026-06-17T01:00:00+00' where match_number = 17;
update ref.matches set kickoff_at = '2026-06-17T04:00:00+00' where match_number = 18;
update ref.matches set kickoff_at = '2026-06-17T17:00:00+00' where match_number = 19;
update ref.matches set kickoff_at = '2026-06-17T20:00:00+00' where match_number = 21;
update ref.matches set kickoff_at = '2026-06-17T23:00:00+00' where match_number = 23;
update ref.matches set kickoff_at = '2026-06-18T02:00:00+00' where match_number = 24;
update ref.matches set kickoff_at = '2026-06-21T00:00:00+00' where match_number = 31;
update ref.matches set kickoff_at = '2026-06-20T00:30:00+00' where match_number = 32;
update ref.matches set kickoff_at = '2026-06-20T03:00:00+00' where match_number = 33;
update ref.matches set kickoff_at = '2026-06-21T04:00:00+00' where match_number = 36;
update ref.matches set kickoff_at = '2026-06-22T01:00:00+00' where match_number = 37;
update ref.matches set kickoff_at = '2026-06-23T23:00:00+00' where match_number = 43;
update ref.matches set kickoff_at = '2026-06-24T02:00:00+00' where match_number = 45;
update ref.matches set kickoff_at = '2026-06-23T03:00:00+00' where match_number = 48;
update ref.matches set kickoff_at = '2026-06-25T23:00:00+00' where match_number = 53;
update ref.matches set kickoff_at = '2026-06-25T23:00:00+00' where match_number = 54;
update ref.matches set kickoff_at = '2026-06-26T02:00:00+00' where match_number = 57;
update ref.matches set kickoff_at = '2026-06-26T02:00:00+00' where match_number = 58;
update ref.matches set kickoff_at = '2026-06-27T00:00:00+00' where match_number = 61;
update ref.matches set kickoff_at = '2026-06-27T00:00:00+00' where match_number = 62;
update ref.matches set kickoff_at = '2026-06-27T03:00:00+00' where match_number = 63;
update ref.matches set kickoff_at = '2026-06-27T03:00:00+00' where match_number = 64;
update ref.matches set kickoff_at = '2026-06-27T23:30:00+00' where match_number = 67;
update ref.matches set kickoff_at = '2026-06-27T23:30:00+00' where match_number = 68;
update ref.matches set kickoff_at = '2026-06-28T02:00:00+00' where match_number = 69;
update ref.matches set kickoff_at = '2026-06-28T02:00:00+00' where match_number = 70;
update ref.matches set kickoff_at = '2026-06-28T19:00:00+00' where match_number = 73;
update ref.matches set kickoff_at = '2026-06-29T17:00:00+00' where match_number = 74;
update ref.matches set kickoff_at = '2026-06-29T20:30:00+00' where match_number = 75;
update ref.matches set kickoff_at = '2026-06-30T01:00:00+00' where match_number = 76;
update ref.matches set kickoff_at = '2026-07-01T01:00:00+00' where match_number = 77;
update ref.matches set kickoff_at = '2026-06-30T17:00:00+00' where match_number = 78;
update ref.matches set kickoff_at = '2026-06-30T21:00:00+00' where match_number = 79;
update ref.matches set kickoff_at = '2026-07-02T00:00:00+00' where match_number = 80;
update ref.matches set kickoff_at = '2026-07-01T16:00:00+00' where match_number = 81;
update ref.matches set kickoff_at = '2026-07-01T20:00:00+00' where match_number = 82;
update ref.matches set kickoff_at = '2026-07-02T19:00:00+00' where match_number = 83;
update ref.matches set kickoff_at = '2026-07-02T23:00:00+00' where match_number = 84;
update ref.matches set kickoff_at = '2026-07-03T03:00:00+00' where match_number = 85;
update ref.matches set kickoff_at = '2026-07-03T18:00:00+00' where match_number = 86;
update ref.matches set kickoff_at = '2026-07-03T22:00:00+00' where match_number = 87;
update ref.matches set kickoff_at = '2026-07-04T01:30:00+00' where match_number = 88;
update ref.matches set kickoff_at = '2026-07-04T17:00:00+00' where match_number = 89;
update ref.matches set kickoff_at = '2026-07-05T20:00:00+00' where match_number = 91;
update ref.matches set kickoff_at = '2026-07-04T21:00:00+00' where match_number = 92;
update ref.matches set kickoff_at = '2026-07-07T00:00:00+00' where match_number = 93;
update ref.matches set kickoff_at = '2026-07-06T19:00:00+00' where match_number = 94;
update ref.matches set kickoff_at = '2026-07-07T16:00:00+00' where match_number = 95;
update ref.matches set kickoff_at = '2026-07-09T20:00:00+00' where match_number = 97;
update ref.matches set kickoff_at = '2026-07-10T19:00:00+00' where match_number = 98;
update ref.matches set kickoff_at = '2026-07-11T21:00:00+00' where match_number = 99;
update ref.matches set kickoff_at = '2026-07-12T01:00:00+00' where match_number = 100;
update ref.matches set kickoff_at = '2026-07-14T19:00:00+00' where match_number = 101;
update ref.matches set kickoff_at = '2026-07-15T19:00:00+00' where match_number = 102;
update ref.matches set kickoff_at = '2026-07-18T21:00:00+00' where match_number = 103;

alter table ref.matches enable trigger user;
