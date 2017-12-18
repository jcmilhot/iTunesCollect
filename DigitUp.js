var itc = require('itunesconnectanalytics');
var fs = require('fs');
var csvWriter = require('csv-write-stream');
var winston = require('winston');
var winlog = require("winston-winlog2");

winston.add(winlog, { source: 'Téléchargement iTunes Digitup' });
winston.info("Démarrage du processus");

var Itunes = itc.Itunes;
var AnalyticsQuery = itc.AnalyticsQuery;

var username = process.env.iTunesConnectDigitUpUser;
var password = process.env.iTUnesConnectDigitUpPassword;
var downloadDirectory = process.env.iTUnesConnectDigitUpDownloadDirectory;
var logDirectory = process.env.iTUnesConnectDigitUpLogDirectory;
var appName = process.env.iTUnesConnectDigitUpAppName;
var appCouranteAdamId=process.env.iTUnesConnectDigitUpAppId;


downloadDirectory = downloadDirectory + (!downloadDirectory.endsWith('\\') ? '\\' : '');
logDirectory = logDirectory + (!logDirectory.endsWith('\\') ? '\\' : '');

if (!fs.existsSync(logDirectory)) {
    console.log('Répertoire local de log introuvable, le process est en échec');
    winston.error('Répertoire local de log introuvable, le process est en échec');
    process.exit(1);
}

Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();
    return [
            this.getFullYear(),
            (mm>9 ? '' : '0') + mm,
            (dd>9 ? '' : '0') + dd
    ].join('');
};

Date.prototype.yyyymmddhhmmss = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();
    var hour = this.getHours();
    var minute = this.getMinutes();
    var seconde = this.getSeconds();

    return [
        this.getFullYear(),
        (mm>9 ? '' : '0') + mm,
        (dd>9 ? '' : '0') + dd,
        '-',
        (hour>9 ? '' : '0') + hour,
        (minute>9 ? '' : '0') + minute,
        (seconde>9 ? '' : '0') + seconde
    ].join('');
};

var nomFichierLog = logDirectory + appName + '-Log-Telechargements-' + new Date().yyyymmddhhmmss() + '.log';

fs.writeFileSync(nomFichierLog, new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Démarrage du process de téléchargement');

if (!fs.existsSync(downloadDirectory)) {
    fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Répertoire local de télécharement introuvable, le process est en échec');
    winston.error('Répertoire local de télécharement introuvable, le process est en échec');
    process.exit(1);
}

Date.prototype.ddmmyy = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();

    return [
        (dd>9 ? '' : '0') + dd,
        (mm>9 ? '' : '0') + mm,
        this.getFullYear().toString().substr(-2)
    ].join('/');
};

//Connexion à iTUnes
var instance = new Itunes(username, password, {
    errorCallback: function(e) {
        console.log('Error logging in: ' + e);
        fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Erreur de connexion à iTunes, le process est en échec. Trace de l erreur: ' + e);
        winston.error('Erreur de connexion à iTunes, le process est en échec. Trace de l erreur: ' + e);
        process.exit(1);
    },
    successCallback: function(d) {
        console.log('Logged in');
        fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Connexion à iTunes OK');
    }
});

var optionsDate = { year: 'numeric', month: '2-digit', day: '2-digit' };

var dateDeb = new Date(2017,0,1);
var dateFin = new Date();
var dateDebString = new Date(2017,0,1).toLocaleDateString("fr", optionsDate);
var dateFinString = new Date().toLocaleDateString("fr", optionsDate);
var nomFichier = downloadDirectory + appName + "-installations.csv";

fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Les données seront téléchargées du ' + dateDebString + ' au ' + dateFinString);

fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Définition de la requête de téléchargement');

var query = AnalyticsQuery.metrics(appCouranteAdamId, {
    measures: itc.measures.installs,
}).date(dateDebString, dateFinString);

fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Connexion à iTunes');
instance.request(query, function (error, result) {
    fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Lancement de la requête de récupération des données');
    fs.writeFileSync(nomFichier, 'Nom,'+appName);
    fs.appendFileSync(nomFichier, '\n'+'Date de début,'+dateDeb.ddmmyy());
    fs.appendFileSync(nomFichier, '\n'+'Date de fin,'+dateFin.ddmmyy());
    fs.appendFileSync(nomFichier, '\n');
    fs.appendFileSync(nomFichier, '\nDate,Installations');
    for (var i = 0; i < result.results[0].data.length; i++) {
        var currentDate = new Date(result.results[0].data[i]['date']);
        var nbInstall = result.results[0].data[i]['installs'];
        fs.appendFileSync(nomFichier, '\n'.concat(currentDate.ddmmyy(), ',', nbInstall));
    }

    fs.appendFileSync(nomFichierLog, '\n' + new Date().yyyymmddhhmmss() + ';' + appName + ';' + 'Fin de récupération des données, le process est en succès');
    winston.info('Fin de récupération des données, le process est en succès');

    //Timeout pour s'assurer que l'écriture dans le journal des événements sera réalisé
	setTimeout(function() {
        process.exit(0);
    }, 5000);
});
