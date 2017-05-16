const fs = require('fs')
const request = require('request')
const moment = require('moment')
const argv = require('yargs')
  .usage('Usage: $0 --username [username] --password [password] --repository [full URL of repository]')
  .demandOption(['username', 'password', 'repository'])
  .default('fileName', 'all_issues.csv')
  .help('h')
  .alias('h', 'help')
  .describe('fileName','Name of output file')
  .version(function () {
    return require('/home/developer/git/ro_convert-github-issues-to-csv/package.json').version
  })
  .alias('version', 'ver')
  .argv
const chalk = require('chalk')

const outputFileName = argv.fileName

const username = argv.username
const password = argv.password
const repoUserName = argv.repository.slice(19, argv.repository.indexOf('/', 19))
const repoUrl = argv.repository.slice(20 + repoUserName.length)

const errorArgument = 'Use proper arguments\n--username\n--password\n--repository'

const startUrl = `https://api.github.com/repos/${repoUserName}/${repoUrl}/issues?per_page=100&state=all&page=1`

const requestOptions = {
  headers: {
    'User-Agent': 'request'
  },
  auth: {
    'user': username,
    'pass': password
  }
}

function main (data, url) {
  requestBody(url, (error, response, body) => {

    let rawLink = response.headers.link

    data += convertJSonToCsv(error, body)

    if (rawLink) {

      if (rawLink.includes('next')) {
        const link = rawLink.slice(rawLink.indexOf('<') + 1, rawLink.indexOf('>'))
        main(data, link)
      }
      else {
        writeData(data, outputFileName)
      }
    }
    else {
      writeData(data, outputFileName)
    }

  })

}

function requestBody (url, callback) {
  console.log('Requesting API...')
  request(url, requestOptions, function (error, response, body) {
    if (error) throw errorArgument
    console.log(chalk.green('API successfully requested'))
    callback(error, response, body)
  })
}

function convertJSonToCsv (err, data) {
  if (err) throw err

  console.log('\nConverting issues...')

  jsData = JSON.parse(data)

  const csvData = jsData.map(object => {
    const date = moment(object.created_at).format('L')
    const labels = object.labels
    const stringLabels = labels.map(label => label.name).toString()

    return `"${object.number}"; "${object.title.replace(/"/g, '\'')}"; "${object.html_url}"; "${stringLabels}"; "${object.state}"; "${date}"\n`
  }).join('')

  console.log(chalk.green('Successfully converted 10 issues!'))
  return csvData
}

function writeData (data, outputFileName) {
  fs.writeFile(outputFileName, data, (err) => {
    if (err) throw err
    console.log('Writing data to csv file')
    console.log(chalk.yellow(`\nProcess was successful\nIssues was downloaded, converted and saved to ${outputFileName}`))
  })
}

main('', startUrl)
