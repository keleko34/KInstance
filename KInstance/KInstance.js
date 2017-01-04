/* Build */
/* End Build */

define(['KB','KMapper','KObservableViewmodel','KTemplates','kbatchloader'],function(K,KMaps,KViewmodel,Ktemplates,kloader){
  function CreateKInstance()
  {
    var KV = KViewmodel(),
        KM = KMaps(),
        KT = Ktemplates(),
        KL = kloader(),
        KB = K(),

    _actions = {
      template:[],
      load:[]
    },
    _onaction = function(a)
    {
      for(var x=0,len=_actions[a.type].length;x<len;x++)
      {
        if(!a._stopPropogation) _actions[a.type][x](a);
      }
      return a._preventDefault;
    };

    function setStopChange(obj,prop,val)
    {
      if(KV.isArray(val) && typeof obj[prop] === 'function')
      {
        obj.stopChange()[prop].apply(obj,val);
      }
      else
      {
        obj.stopChange()[prop] = val;
      }
    }

    /* what does this do?
       takes in unkown element, reads attributes to object, maps outside binds as pointers, searches for unkowns in html to load, creates viewmodel, binds values
       ex.
       <form-container inputs="4" submitbtn="true"></form-container>
       transforms into:
       <div class="form-container__wrapper">
         <div class="form-container">
            <form>
                <input />
                <input />
                <input />
                <input />
                <button>Submit</button>
            </form>
         </div>
       </div>
    */


    /* instance --> Create VM,Replace Template --> Attach VM, Map --> bind values --> search inner Components --> Map For Loops */

    function KInstance(node,pre,post)
    {
      
      /* Create VM */
      var _name = node.tagName.toLowerCase(),
          _template = document.createElement('div'),
          _unknowns = [],
          _childNodes = Array.prototype.slice.call(node.childNodes),
          _forData = [],
          _viewmodel = KV(node,[],pre,post);


      /* Replace Template */
      _template.className = _name+"__Wrapper";
      _template.innerHTML = KT.getTemplate(_name);
      _unknowns = KT.getUnknownElements(_template.innerHTML);
      node.replaceWith(_template);
      if(node.onload) node.onload(_template,_viewmodel);
      node = null;

      /* Attach VM */
      Array.prototype.slice.call(_template.querySelectorAll('*'))
      .forEach(function(el){
        Object.defineProperties(_template,{
          kb_viewmodel:{
            value:_viewmodel,
            writable:false,
            enumerable:false,
            configurable:false
          }
        });
      });

      /* Map Node */
      KM.addActionListener('update',function(e){

        /* if a straight update happens via textContent */
        if(e.data.attr === 'textContent' && e.data.map && Object.keys(e.data.map.binds).length === 1)
        {
          e.data.map.element = e.data.target.childNodes[0];
          e.data.map.target = e.data.map.element;
          _template.kb_viewmodel.setScopeByScopeString(_template.kb_viewmodel,Object.keys(e.data.map.binds)[0],e.data.value);
        }
        /* update VM on change */
        console.log(e);

      })
      .call(null,_template);

      /* bind values */
      for(var x=0,len=_template.kb_maps.length;x<len;x++)
      {
        (function(map,node){
          if(map.type === 'attribute')
          {
            /* Bind VM Data to the attributes */
            var binds = Object.keys(map.binds);
            for(var i=0,lenI=binds.length;i<lenI;i++)
            {
              (function(bindNode,bind,map){
                bindNode.kb_viewmodel.addDataUpdateListener(bind,function(e){
                    KInstance.replaceMap(map,bindNode.kb_viewmodel,true);
                });
              }(node,binds[i],map));
            }
            KInstance.replaceMap(map,node.kb_viewmodel,true);
          }
          else if(map.type === 'text')
          {
            /* Adds containment HTML from the unkown Element components children from previous component */
            if(map.binds.html && map.texts.length === 1){
              for(var i=0,lenI=_childNodes.length;i<lenI;i++)
              {
                map.parent.stopChange().insertBefore(_childNodes[i],map.target);
              }
              _childNodes = null;
              map.parent.stopChange().removeChild(map.target);
              node.kb_maps.splice(x,1);
            }
            else
            {
              /* Bind VM Data to the texts */
              var binds = Object.keys(map.binds);
              for(var i=0,lenI=binds.length;i<lenI;i++)
              {
                (function(bindNode,bind,map){
                  bindNode.kb_viewmodel.addDataUpdateListener(bind,function(e){
                    KInstance.replaceMap(map,bindNode.kb_viewmodel);
                  });
                }(node,binds[i],map));
              }
              KInstance.replaceMap(map,node.kb_viewmodel);
            }
          }
          else if(map.type === 'component')
          {
            /* Mapping Takes care of this */
          }
          else if(map.type === 'for'){

            /* append to for group for taking care of later */
            _forData.push(map);
          }
        }(_template.kb_maps[x],_template));
      }

      /* Map For Loops */
      for(var x=0,len=_forData.length;x<len;x++)
      { 
        (function(fordata){
          /* clear html to get ready for appendChild */
          fordata.parent.stopChange().innerHTML = "";
          
          fordata.data = _viewmodel[fordata.binds.key];
          
          _unknowns.push(fordata.binds.component);
          
          /* add listeners for watching adds or removes or changes in the array */
          watchforArray(_viewmodel[fordata.binds.key],fordata);
          
          for(var i=0,lenI=_viewmodel[fordata.binds.key].length;i<lenI;i++)
          {
            (function(componentName,data,filters){
              var filtered = false;
              for(var z=0,lenZ=filters.length;z<lenZ;z++)
              {
                if(filters[z](data) === false) filtered = true;
              }
              if(!filtered)
              {
                var comp = document.createElement(componentName);
                comp.post = data;
                fordata.parent.stopChange().appendChild(comp);
                comp = null;
              }
            }(fordata.binds.component,_viewmodel[fordata.binds.key][i],fordata.binds.filters));
          }
        }(_forData[x]));
      }
      
      /* search inner Components */
      var notLoaded = _unknowns.filter(function(unknown){
        return !KT.isRegistered(unknown);
      })
      .map(function(item){
        return '/component/'+item+'.js';
      });
      
      if(notLoaded.length !== 0)
      {
        KL.fetchBatch(notLoaded,function(){
          replaceUnknowns(_template,_unknowns);
        });
      }
      else
      {
        replaceUnknowns(_template,_unknowns);
      }
    }

    function actionObject(type,data,args)
    {
      this.stopPropagation = function(){
        this._stopPropagation = true;
      }
      this.type = type;
      this.data = data;
      this.args = args;
    }
    
    function watchforArray(data,forMap)
    {
      function onChange()
      {
        /* when change happens reupdate nodes depending on action, sort does flush/reapply, add/remove simply appends/removes */
        
      }
      
      data.addActionListener('add',onChange)
      .addActionListener('remove',onChange)
      .addActionListener('sort',onChange);
    }
    
    function replaceUnknowns(node,unknowns)
    {
      for(var x=0,len=unknowns.length;x<len;x++)
      {
        (function(unknown,parent){
          var nodes = parent.querySelectorAll(unknown);
          for(var i=0,lenI=nodes.length;i<lenI;i++)
          {
            KInstance(nodes[i],nodes[i].pre,nodes[i].post);
          }
        }(unknowns[x],node));
      }
    }

    KInstance.replaceMap = function(map,viewmodel,isAttribute)
    {
      var val = map.bindTexts.map(function(t){
        if(KV.isObject(t))
        {
          return t.filters.reduce(function(val,filter){
            return viewmodel.filters[filter](val);
          },(viewmodel.getScopeByScopeString(viewmodel,t.key)));
        }
      }).join('');
      if(!isAttribute)
      {
        setStopChange(map.target,map.prop,val);
      }
      else
      {
        setStopChange(map.element,'setAttribute',[map.prop,val]);
      }
    }

    KInstance.register = function(name,viewmodel,template)
    {
      KV.register(name,viewmodel);
      var a = new actionObject('template',KT.register(name,template),arguments);
      _onaction(a);
      return this;
    }

    KInstance.fetchAttributes = function(node)
    {
      var _attrs = {};
      for(var x=0,len=node.attributes.length;x<len;x++)
      {
        _attrs[node.attributes[x].name] = node.attributes[x].nodeValue;
      }
      return _attrs;
    }

    return KInstance;
  }
  return CreateKInstance;
});


/* instance

<div>

<cool> <-- new instance
 <something>{{why}}</something> <-- new instance
</cool>
</div>

*/
