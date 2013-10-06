#!/usr/bin/env node

var _       = require('lodash');
var kue     = require('kue');
var opxi2 = require( 'opxi2node' );

/*program
.option('-s, --state <active|failed|complete>' , 'Which job state to act on'  )
.option('-p, --port <int>' , 'Server port')
.option('-h, --host <string>' , 'Server hostname')
.parse(process.argv);*/


var state = "failed"/*program.state*/;
if(!state){
    console.log("must provide state -s");
    process.exit();
}

/*var config = {
    host : program.host ? program.host : 'localhost'
  , port : program.port ? program.port : 6379
};*/

var q = opxi2.taskq;
var r = opxi2.brokerClient();

var queue = q[state];
if(!queue){
    console.log("Invalid state: " + state);
    process.exit();
}

queue.call(q,function(err,v){
    if(err) throw err;

    var missing_job_ids    = [];
    var corrupted_job_keys = [];

    var fin = _.after(v.length, function(){

        var exit = _.after(2,process.exit);

        if(missing_job_ids.length > 0){
            console.log("Removing " + missing_job_ids.length + " missing jobs");
            r.zrem(['q:jobs:'+state].concat(missing_job_ids),function(err){
                if(err) console.dir(err);
                exit();
            });
        }
        else exit();

        if(corrupted_job_keys.length > 0){
            console.log("Removing " + corrupted_job_keys.length + " corrupted jobs");
            r.del(corrupted_job_keys,function(err){
                if(err) console.dir(err);
                exit();
            });
        }
        else exit();
    });

    _.each(v,function(id){
        kue.Job.get(id,function(err,job){
            if(err){
                if(err.message.match(/doesnt exist$/)){
                    console.log(err.message);
                    missing_job_ids.push(id);
                }
                fin();
            }
            else if(!job){ // this is a q:job:[id] record sans "type" attribute, which causes kue to return nothing here, lame
                console.log("No job for id:" + id);
                corrupted_job_keys.push('q:job:'+id);
                fin();
            }
            else{
                job.state('inactive',function(err){
                    if(err) console.dir(err);
                    fin();
                });
            }
        });
    });
});