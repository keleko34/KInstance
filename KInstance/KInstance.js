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
        obj._stopChange = true;
        obj[prop].apply(obj,val);
        obj._stopChange = null;
      }
      else
      {
        Object.getOwnPropertyDescriptor(obj,prop).set.call(obj,val,true);
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
          _childNodes = node.childNodes,
          _forData = [],
          _viewmodel = KV(node,[],pre,post);


      /* Replace Template */
      _template.class = _name+"__Wrapper";
      _template.innerHTML = KT.getTemplate(_name);
      node.replaceWith(_template);
      node = null;

      /* Attach VM */
      Object.defineProperties(_template,{
        kb_viewmodel:{
          value:_viewmodel,
          writable:false,
          enumerable:false,
          configurable:false
        }
      });

      /* Map Node */
      KM.addActionListener('update',function(e){

        /* update VM on change */
        console.log(e);

      })
      .call(null,node);

      /* bind values */
      for(var x=0,len=_template.kb_maps.length;x<len;x++)
      {
        var map = _template.kb_maps[x];
        if(map.type === 'attribute')
        {
          /* Bind VM Data to the attributes */
          var binds = Object.keys(map.binds);
          for(var i=0,lenI=binds.length;i<len;i++)
          {
            _template.kb_viewmodel.addDataUpdateListener(binds[i].key,function(e){

                var val = map.bindTexts.map(function(t){
                  if(KV.isObject(t))
                  {
                    return t.filters.reduce(function(val,filter){
                      return filter(val);
                    },(e.prop !== t.key ? t.value : e.value));
                  }
                }).join('');
                setStopChange(map.target,'setAttribute',[map.prop,val]);
            });
          }
        }
        else if(map.type === 'text')
        {
          /* Adds containment HTML from the unkown Element components children from previous component */
          if(map.binds.html && map.texts.length === 1){
            for(var i=0,lenI=_childNodes.length;i<lenI;i++)
            {
              map.parent.insertBefore(map.target,_childNodes[i]);
            }
            map.parent.removeChild(map.target);
            _template.kb_maps.splice(x,1);
          }
          else
          {
            /* Bind VM Data to the texts */
            var binds = Object.keys(map.binds);
            for(var i=0,lenI=binds.length;i<len;i++)
            {
              _template.kb_viewmodel.addDataUpdateListener(binds[i].key,function(e){

                var val = map.bindTexts.map(function(t){
                  if(KV.isObject(t))
                  {
                    return t.filters.reduce(function(val,filter){
                      return filter(val);
                    },(e.prop !== t.key ? t.value : e.value));
                  }
                }).join('');
                setStopChange(map.target,map.prop,val);
            });
            }
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
      }

      /* search inner Components */

      /* Map For Loops */


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
