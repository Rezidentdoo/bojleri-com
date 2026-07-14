#!/usr/bin/env node
import { formatProductDescription } from "../src/lib/cms/format-product-description.mjs";

const sample = `Protočni bojler Bosch TR4000 5 ET je kompaktan elektronski kontrolisan uređaj idealan za ugradnju ispod umivaonika u kupatilu ili kuhinji.
Glavne prednosti:

Elektronska regulacija obezbeđuje konstantnu temperaturu vode
Ušteda do 20% energije i vode u odnosu na hidraulične modele
Eco režim za još veću uštedu struje
Grejač od nerđajućeg čelika – visoka otpornost na kamenac i mehuriće vazduha
Brzo zagrevanje zahvaljujući inovativnom grejaču
Jednostavna montaža sa priključcima označenim bojama
Mogućnost rada u otvorenom i zatvorenom sistemu

Tehničke karakteristike:

Snaga: 4,5 kW (monofazni 230V)
Dimenzije: 140 × 185 × 88 mm
Klasa zaštite: IP24D
Neto težina: 1,17 kg

Preporuka: Odličan izbor za jedno potrošno mesto (umivaonik ili tuš kabina).`;

console.log(formatProductDescription(sample));
console.log("\n---\nOK");