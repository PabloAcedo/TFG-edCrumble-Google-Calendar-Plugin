
/*************************************************************************************/
function exporter(){

    var that = this;

    this.parse_task = function(task,j){
        var type_arr = ["","Neutral","Remembering","Understanding","Applying","Analysing","Evaluating","Creating"];
        var student_role_arr = ["","Individual","Group","All_Class"];
        var teacher_role_arr = ["","Teacher_not_present","Teacher_Available_Online","Teacher_Available_F2F"];
        var graded_arr = ["","Not_Graded","Auto_Evaluation", "Graded"];
        j++;
        var resources_list = "";
        if(resources_list.length == 0){
            resources_list = " ";
        }else{
            resources_list = task.resources.toString();
        }
        var text ="#Task:"+j+"\n#Duration:"+task.min+"\n#Task_type:"+type_arr[task.type]+
        "\n#Students_work:"+student_role_arr[task.student_role]+"\n#Students_group:"+task.students_group+
        "\n#Teachers_presence:"+teacher_role_arr[parseInt(task.teacher_role)]+
        "\n#Evaluation:"+graded_arr[task.graded]+"\n#Description:"+task.description+
        "\n#Resources:\n"+resources_list+"\n\n";
        return text;
    };

    this.create_event = function(activity, description){
        var group = "";
        if(activity.group == 1){
            group = "in_class"
        }else if(activity.group == 2){
            group = "out_class";
        }
        var event = {
            'summary': activity.title+": "+group,
            'colorId': String(activity.group),
            'start': {
                'dateTime': activity.start,
                'timeZone': DB.timeZone
            },
            'end': {
                'dateTime': activity.end,
                'timeZone': DB.timeZone
            },
            'description': description
        };
        return event;
    };

    this.create_calendar = function(){
        var project_name = DB.json.designTitle;
        var calendarObj = {
            summary: project_name,
            timeZone: DB.timeZone
        };
        var request = gapi.client.calendar.calendars.insert(calendarObj);
        document.querySelector("body").style.cursor = "wait";
        request.execute(function(calendar){
            DB.calendars.push(calendar);
            console.log(DB.calendars);
            add_selectorOption(calendar.summary, DB.calendars.length);
            that.add_event(DB.calendars.length-1);
            document.querySelector("body").style.cursor = "auto";
        });
    };

    this.add_event = function(index){
        for(var i = 0; i<DB.events_to_export.length; i++){
            var desc = " ";
            for(var j = 0; j < DB.events_to_export[i].tasks.length; j++){
                desc += that.parse_task(DB.events_to_export[i].tasks[j],j);
            }
            var event = that.create_event(DB.events_to_export[i], desc);
            var selector = document.querySelector("#calendars_selector");
            if(!selector){console.log("There is not a selector"); return;}
            var id = DB.calendars[index].id;
            console.log("CalID:",id);
            var request = gapi.client.calendar.events.insert({
                'calendarId': id,
                'resource': event
                });
            request.execute(function(event) {
                console.log('Event created: ' + event.htmlLink);
            });
        }
    };
}

/*************************************************************************************/
function importer(){
    var that = this;

    this.fieldInObject = function(obj,field){
        if(!obj[field]){
            return obj[""];
        }else{
            return obj[field];
        }
    };

    this.getEvents = function(){
        var selector = document.querySelector("#calendars_selector");
        if(!selector){console.log("There is not a selector"); return;}
        var id = DB.calendars[parseInt(selector.value)].id;
        var request = gapi.client.calendar.events.list({"calendarId":id});
        request.execute(function(response){
            DB.events_to_import = response.result.items;
            DB.eventsREADY2import = that.convertEvents();
            console.log("Success!!");
        });
    };

    this.extractLineData = function(fullstring, keyword){
        if(fullstring.search(keyword)!=-1){
            var result = fullstring.replace(keyword,"");
            result = result.replace("\n","");
            return result;           
        }
        return -1;
    };

    this.createTask = function(){
        var task = {};
        task.resources = [];
        task.students_group = 2;
        task.min = "1";
        task.type = 1;
        task.student_role = "1";
        task.teacher_role = "3";
        task.graded = "1";
        task.description = "";
        task.FC="1";task.PBL="1";task.DP = "1";
        return task;
    };

    this.parse_tasks = function(description){
        var tasks = [];
        var mapper={
            type:{
                '':1,
                'Neutral':1,
                'Remembering':2,
                'Understanding':3,
                'Applying':4,
                'Analysing':5,
                'Evaluating':6,
                'Creating':7
            },
            student_role:{
                '':"1",
                'Individual':"1",
                'Group':"2",
                'All_Class':"3"
            },
            teacher_role:{
                '':"1",
                'Teacher_not_present':"1",
                'Teacher_Available_Online':"2",
                'Teacher_Available_F2F':"3"
            },
            graded:{
                "":"1",
                "Not_Graded":"1",
                "Auto_Evaluation":"2", 
                "Graded":"3"
            }
        };
        var duration="#Duration:";
        var task_ ="#Task:";
        var tasktype="#Task_type:";
        var students_work = "#Students_work:";
        var teacher_presence ="#Teachers_presence:";
        var ev ="#Evaluation:";
        var desc = "#Description:";
        var students_group = "#Students_group:";
        var res = "#Resources:";

        var lines = description.match(/^.*([\n\r]+|$)/gm); //full string to array of strings(containing all the lines)
        var task = this.createTask();
        for(var i = 0; i < lines.length; i++){
            var l = lines[i];
            if(that.extractLineData(l, task_)!=-1 && i > 0 || i == lines.length-1){
                tasks.push(task);
                task=this.createTask();
            }
            if(that.extractLineData(l, duration)!=-1){
                task.min=that.extractLineData(l, duration); dur = true;
            }
                
            if(that.extractLineData(l, tasktype)!=-1){
                var index = that.extractLineData(l, tasktype);
                task.type = parseInt(that.fieldInObject(mapper.type,index));
            }
                
            if(that.extractLineData(l, students_work)!=-1){
                var index = that.extractLineData(l, students_work);
                task.student_role = that.fieldInObject(mapper.student_role,index);
            }
                
            if(that.extractLineData(l, teacher_presence)!=-1){
                var index = that.extractLineData(l, teacher_presence);
                task.teacher_role = that.fieldInObject(mapper.teacher_role,index);
            }
                
            if(that.extractLineData(l, ev)!=-1){
                var index = that.extractLineData(l, ev);
                task.graded = that.fieldInObject(mapper.graded,index);
            }
                
            if(that.extractLineData(l, desc)!=-1){
                task.description=that.extractLineData(l, desc);
            }

            if(that.extractLineData(l, students_group)!=-1){
                task.students_group= parseInt(that.extractLineData(l, students_group));
            }
            if(that.extractLineData(l, res)!=-1){
                var raw_arr = Array.from(that.extractLineData(l, res));
                var num_arr = [];
                for(var u = 0; u < raw_arr.length; u++){
                    var extracted_number = parseInt(raw_arr[u]);
                    if(!Number.isNaN(extracted_number)){
                        num_arr.push(extracted_number);
                    }
                }
                if(DB.json.last_resource_id == 0) num_arr = []; //there are not resources to point
                task.resources = num_arr;
            }
        }
        
        return tasks;
    };

    this.download = function(filename, text){
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };
    

    this.convertEvents = function(){
        console.log("Number of events to import:",DB.events_to_import.length);
        var items = [];
        for(var i = 0; i < DB.events_to_import.length; i++){
            var event = DB.events_to_import[i];
            //avoid insert events out of range of time
            if(event.start.dateTime < DB.json.startDate || event.start.dateTime > DB.json.endDate){
                continue;
            }
            var item = {};
            item.id = i;
            item.content = item.title = event.summary;
            item.start = event.start.dateTime;
            item.end = event.end.dateTime;
            item.group = 1;
            if(that.extractLineData(event.summary, ": in_class")!=-1){
                item.group = 1;
            }else if(that.extractLineData(event.summary, ": out_class")!=-1){
                item.group = 2;
            }
            var classnames = ["","in","out"];
            item.className = classnames[item.group];
            item.objectives = [];
            item.visibleFrameTemplate = "";
            var description = "";
            if(typeof event.description === 'undefined'){
                console.log("unfefined");
            }else{
                description = event.description;
                console.log(typeof(event.description));
            }
            item.tasks = that.parse_tasks(description);
            items.push(item);
        }
        console.log(JSON.stringify(items));
        DB.json.itemsList = items;
        DB.json.last_item_id = items.length-1;
        that.download(DB.json.designTitle+".json",JSON.stringify(DB.json)); //for now, download the new json file
    }

}

/*************************************************************************************/
//HTML visual control
var taskTemplate = document.getElementById("help_button");
taskTemplate.style.display = "none";

var help_text = "#Task: #integer \n#Duration: #integer"+
"\n#Task_type: #[Neutral,Remembering,Understanding,Applying,Analysing,Evaluating,Creating]"+
"\n#Students_work: #[Individual,Group,All_Class]\n#Students_group: #integer"+
"\n#Teachers_presence: #[Teacher_not_present,Teacher_Available_Online,Teacher_Available_F2F]"+
"\n#Evaluation: #[Not_Graded,Auto_Evaluation, Graded]\n#Description: #description\n#Resources:#integers separated by commas(ex: 1,2,3,4)";

//inspired from: https://www.30secondsofcode.org/blog/s/copy-text-to-clipboard-with-javascript
const copyTemplate = function(){
    const txt = document.createElement('textarea');
    txt.value = help_text;
    txt.setAttribute('readonly', '');
    txt.style.position = 'absolute';
    txt.style.left = '-9999px';//trick
    document.body.appendChild(txt);
    txt.select();
    document.execCommand('copy');
    document.body.removeChild(txt);
    console.log(help_text);
};
taskTemplate.onclick = copyTemplate;

var checkbox = document.getElementById("createCal");
checkbox.onclick = function(){
    if(checkbox.checked){
        selector.style.display = "none";
    }else if(!checkbox.checked){
        selector.style.display = "inline";
    }
    console.log("hi");
};

var exportMode = document.getElementById("exportmode");
var importMode = document.getElementById("importmode");
var warning_ = document.getElementById("warning");
exportMode.onclick = function(){
    document.getElementById("chlabel").style.display = checkbox.style.display =
    add_button.style.display = "inline";
    warning_.style.display = import_button.style.display = "none";
    exportMode.style.backgroundColor = "#ebebeb";
    importMode.style.backgroundColor = "white";
    taskTemplate.style.display = "none";
    if(checkbox.checked)
        selector.style.display = "none";
}

importMode.onclick = function(){
    document.getElementById("chlabel").style.display = checkbox.style.display =
    add_button.style.display = "none";
    import_button.style.display = "inline";
    importMode.style.backgroundColor = "#ebebeb";
    exportMode.style.backgroundColor = "white";
    taskTemplate.style.display = "inline";
    selector.style.display = "inline";
    warning_.style.display = "block";
}
/*************************************************************************************/
var exp = new exporter();
var imp = new importer();
add_button.addEventListener("click",function(){
    if(checkbox.checked){
        exp.create_calendar();
    }else{
        exp.add_event(parseInt(selector.value));
    }
});
import_button.addEventListener("click",imp.getEvents);
