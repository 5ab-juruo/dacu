#!/usr/bin/env node

const
    pkg = require('../package'),
    fs = require('fs'),
    shajs = require('sha.js'),
    sh = require('shelljs'),
    dirn = '.dacu',
    tskn = 'tasks.json'

function pthjoin(...arr) {
    return arr.join('/')
}

function gerr(err) {
    if (typeof err === 'string')
        console.log('Error:', err)
    else
        console.log(err.toString().split('\n')[0])
    process.exit(1)
}

function nf(fn, content = '') {
    if (content instanceof Object)
        content = JSON.stringify(content)
    try {
        fs.writeFileSync(pthjoin(dirn, fn), content)
    } catch(err) {
        gerr(err)
    }
}

function nd(dn) {
    try {
        fs.mkdirSync(pthjoin(dirn, dn))
    } catch(err) {
        gerr(err)
    }
}

const rdf = fn => fs.readFileSync(fn, { encoding: 'utf-8' })

const lang_dl = {
    cpp: {
        compile: fn => sh.exec(`g++ ${fn} -o ${fn.replace(/.cpp$/, '')}`),
        runner: fn => fn.replace(/.[^.]*$/, '')
    },
    py: {
        compile: () => 0,
        runner: fn => `python ${fn}`
    },
    js: {
        compile: () => 0,
        runner: fn => `node ${fn}`
    }
}

function tarfile(fn) {
    let nfn = pthjoin(dirn, fn)
    this.fn = nfn
    this.value = JSON.parse(fs.readFileSync(nfn))
    this.assign = obj => Object.assign(this.value, obj)
    this.unload = () => {
        fs.writeFileSync(nfn, JSON.stringify(this.value))
    }
    return this
}

const app = new (require('commander')).Command()
    .name('dacu')
    .description(pkg.description)
    .version(pkg.version)

app.command('init')
    .description('initialize a directory for dacu.')
    .argument('<dir>', 'directory to initialize')
    .option('-f, --force', 'force to initialize, or clear and reinitialize if it exists')
    .action((dir, opt) => {
        let tar = [dir, '.dacu'].join('/')
        if (opt.force)
            fs.rmdirSync(tar, { recursive: true })
        try {
            fs.mkdirSync(tar)
        } catch(err) {
            console.log(err.toString().split('\n')[0])
        }
        nf('tasks.json', {
            version: 1,
            tasks: []
        })
        nf('.config')
    })

/* TODO
app.command('config')
    .description('configure settings.')
    .argument('<entry>', 'target entry')
    .argument('[value]', 'value to set')
    .option('-g, --global', 'set global config')
    .option('-l, --local', 'set local config')
    .action((ent, val, opt) => {
    })
*/

app.command('add-task')
    .description('add tasks')
    .argument('<file>', 'target file')
    .argument('[task_name]', 'name for the new task')
    .action((fn, tn) => {
        if (!tn) {
            tn = fn.split('.')[0].replace(/\s+/g, '-')
            console.log(`Auto-generated task name ${tn} for file ${fn}`)
        }
        
        let tasks = new tarfile(tskn)
        if (tasks.value.tasks.some(v => (v.name === tn)))
            gerr('this task has already created.')
        if (tasks.value.tasks.some(v => (v.target === fn)))
            gerr('this file has been bound.')
        
        let gid = shajs('sha256').update(tn).digest('hex')
        tasks.value.tasks.push({
            name: tn,
            target: fn,
            id: gid,
            count: 0
        })
        nd(gid)
        tasks.unload()
    })

app.command('add-data')
    .description('add data sets')
    .argument('<task>', 'the task this pair of data add to, accept file names and task names')
    .argument('[input_entry]', 'entry point of input file')
    .argument('[output_entry]', 'entry point of output file')
    .option('-e, --use-editor <editor>', 'use editor to fill in I/O files')
    .option('--no-prompt', 'do not alert prompt before giving datasets')
    .action(async (tsk, inp, oup, opt) => {
        let tarf = new tarfile('tasks.json'), gtsk
        if (!tarf.value.tasks.some(val => ((val.name === tsk || val.target == tsk) && (gtsk = val))))
            gerr(`cannot find task ${tsk}`)
        const getf = async (ty, fn, exp) => {
            if (fn) {
                fs.copyFileSync(fn, exp)
            }
            else {
                if (opt.useEditor) {
                    console.log(`Invoking editor to fill ${ty} file...`)
                    sh.exec(`${opt.useEditor} ${exp}`)
                }
                else {
                    if (!opt.noPrompt)
                        console.log(`Reading from stdin to fill ${ty} file, Use Ctrl+D in a new line to finish reading.`)
                    fs.writeFileSync(exp, await (async () => {
                        return new Promise((resolve) => {
                            let cont = ''
                            require('readline').createInterface({
                                input: process.stdin,
                                output: process.stdout
                            }).on('line', chk => {
                                cont += chk + '\n'
                            }).on('pause', () => {
                                resolve(cont)
                            })
                        })
                    })())
                }
            }
        }
        await getf('input', inp, pthjoin(dirn, gtsk.id, gtsk.count + '.in'))
        await getf('output', oup, pthjoin(dirn, gtsk.id, gtsk.count + '.out'))
        console.log(`Successfully created ${gtsk.name}/${gtsk.count++}.(in|out).`)
        tarf.unload()
        
    })

app.command('test')
    .description('test task(s)')
    .argument('[task...]', 'task(s) to test, leave it empty to test all')
    .option('-s, --strict', 'strict comparisons, extra spaces and line feeds are not allowed anymore.')
    .action((arg, opt) => {
        let tarf = new tarfile('tasks.json')
        
        const runw = gtsk => {
            console.log(`Running task ${gtsk.name} to ${gtsk.target}, ${gtsk.count} data sets found.`)
            
            let suf = gtsk.target.match(/.[^.]*$/)[0].substring(1), errc
            if ((errc = lang_dl[suf].compile(gtsk.target).code))
                gerr(`compilation error with return code ${errc}.`)
            const gfn = (i, fx) => pthjoin(dirn, gtsk.id, i) + '.' + fx
            const cmp = (s1, s2) => {
                if (opt.strict)
                    return !(s1 === s2);
                
                [s1, s2] = [s1, s2].map(s => s.trimEnd()
                    .split('\n')
                    .reduce((res, val) => (res + val.trimEnd() + '\n'), ''))
                return !(s1 === s2)
            }
            for (let i = 0; i < gtsk.count; i++) {
                if ((errc = sh.exec(`${lang_dl[suf].runner(gtsk.target)} < ${gfn(i, 'in')} > ${pthjoin(dirn, 'tmpout')}`).code))
                    gerr(`running failed with return code ${errc}.`)
                if (cmp(rdf(gfn(i, 'out')), rdf(pthjoin(dirn, 'tmpout'))))
                    gerr(`Wrong answer on test ${i}.`)
                else
                    console.log(`Accepted test ${i}.`)
            }
        }
        
        if (!arg.length)
            tarf.value.tasks.forEach(runw)
        else {
            console.log('No task names specified, run all tasks by default.')
            arg.forEach(tsk => {
                let gtsk
                if (!tarf.value.tasks.some(val => ((val.name === tsk || val.target == tsk) && (gtsk = val))))
                    gerr(`cannot find task ${tsk}`)
                runw(gtsk)
            })
        }
    })
app.parse()