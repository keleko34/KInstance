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

    function KInstance(node)
    {
      var _name = node.tagName.toLowerCase(),
          _post = KInstance.fetchAttributes(node),
          _pre = {
            filters:{}
          },
          _params = [],
          _template = document.createElement('div');

      _template.class = _name+"__Wrapper";
      _template.innerHTML = KT.getTemplate(_name);
      node.replaceWith(_template);
      node = null;

      Object.defineProperties(_template,{
        kb_viewmodel:{
          value:KV.createViewModel(_name,_params,_pre,_post),
          writable:false,
          enumerable:false,
          configurable:false
        },
        kb_maps:{
          value:KM.map(_template),
          writable:false,
          enumerable:false,
          configurable:false
        }
      });

      console.log(_template.kb_viewmodel,_template.kb_maps);

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
