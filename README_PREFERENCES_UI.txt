Det här är frontend-steget som gör nästa rekommenderade steg synligt i appen.

Nu läggs följande till i gränssnittet:
- ny menyflik: Önskemål
- lista på medarbetare
- välj medarbetare
- formulär för personliga önskemål
- spara önskemål i frontend-state
- wizardens genereringssteg visar att önskemål vägs in

Filer att ersätta/lägga till:
- frontend/src/App.jsx
- frontend/src/components/PersonalPreferencesForm.jsx
- frontend/src/styles.css

Viktigt:
Det här är fortfarande frontend-kopplat, men nu blir funktionaliteten synlig och användbar.
Nästa steg efter detta är att koppla dessa sparade önskemål direkt till backend API och riktig schemagenerering.