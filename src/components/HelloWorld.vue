<template>
    <el-steps :active="2" align-center finish-status="success">
      <el-step title="选择文件" description="Some description" />
      <el-step title="上传文件" description="Some description" />
      <el-step title="上传账单" description="Some description" />
      <el-step title="Step 4" description="Some description" />
    </el-steps>
  <el-form>
    <el-form-item label="Internal Integration Token">
      <el-input v-model="token" placeholder="Please input" />
    </el-form-item>
    <el-form-item label="pageId">
      <el-input v-model="pageId" placeholder="Please input" @input="pageIdChange" />
    </el-form-item>
    <el-form-item label="上传文件">
      <el-upload
          class="upload-demo"
          action="https://run.mocky.io/v3/9d059bf9-4660-45f2-925d-ce80ad6c4d15"
          :before-upload="beforUpload"
      >
        <el-button type="primary">Click to upload</el-button>
      </el-upload>
    </el-form-item>
  </el-form>
    <el-timeline>
      <el-timeline-item
          v-for="(activity, index) in activities"
          :key="index"
          :timestamp="activity.timestamp"
      >
        {{ activity.content }}
      </el-timeline-item>
    </el-timeline>
</template>
<script lang="ts" setup>
import { ref, reactive } from 'vue'

import { ElLoading } from 'element-plus'

const activities = reactive([])

const token = ref('secret_nRHGl5uaQC3UR4KAedW1wKrbuKkF8DhZVXvklhIJGQD')

import axios from "axios";
const {get, post} = axios.create({
  baseURL: '/v1',
  timeout: 100000,
  headers: {
    'Authorization': 'Bearer ' + token.value
    , 'Notion-Version': "2022-06-28"
  }
});
const pageId = ref("16cc5bde7f154272b8df608eaead1a8d")
let databaseMap = {};
let blockMap = {};
/**
 * 校验block是否在指定的page中
 **/
const checkBlock: (blockId) => Promise<number> = async (blockId) => {
  let result = await get("/blocks/" + blockId);
  let parent = result.data.parent;
  if (parent.type === "block_id") {
    return await checkBlock(parent.block_id);
  }
  if (parent.page_id.replaceAll("-", "") === pageId.value.replaceAll("-", "")) {
    blockMap[blockId] = 1;
  } else {
    blockMap[blockId] = -1;
  }
  return blockMap[blockId];
};
/**
 * 异步filter
 **/
const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
};
https://www.notion.so/16cc5bde7f154272b8df608eaead1a8d#3ac6d5392fe84b839758268936752138

  post("/search",{
    filter: {
      value:"database",
      property :"object"
    }
  }).then(async response => {
    // 获取所有database
    // 筛选出账单页面的database
    let results = response.data.results;
    let arr =  await asyncFilter(results, async item => {
      let parent = item.parent;
      if (parent.type === "block_id") {
        if (!blockMap[parent.block_id]) {
          return (await checkBlock(parent.block_id) === 1);
        } else {
          return (blockMap[parent.block_id] === 1);
        }
      } else {
        return parent.page_id.replaceAll("-", "") === pageId.value.replaceAll("-", "")
      }
      return false;
    });
    arr.forEach(item => {
      databaseMap[item.title[0].text.content] = item.id;
    })
  })

const pageIdChange: () => void = () => {
  console.log(pageId.value.trim().length);
  if (pageId.value.trim().replaceAll("-", "").length === 32 ) {
    databaseMap = {}
    blockMap = {}

    post("/search",{
      filter: {
        value:"database",
        property :"object"
      }
    }).then(async response => {
      // 获取所有database
      // 筛选出账单页面的database
      let results = response.data.results;
      let arr = await asyncFilter(results, async item => {
        let parent = item.parent;
        if (parent.type === "block_id") {
          if (!blockMap[parent.block_id]) {
            return (await checkBlock(parent.block_id) === 1);
          } else {
            return (blockMap[parent.block_id] === 1);
          }
        } else {
          return parent.page_id.replaceAll("-", "") === pageId.value.replaceAll("-", "")
        }
        return false;
      });
      arr.forEach(item => {
        databaseMap[item.title[0].text.content] = item.id;
      })
    })
  }
}
// instance.get("/databases/5f69add9ca154618a0dc01d56a4ab67a").then(response=>{
//   console.log(response);
// })

/**
 * 根据交易日期获取database标题名
 * @param str 交易日期
 */
const getTitle: (str) => string = (str) => {
  return str.substring(0,8).replace("-","年").replace("-","月")
}

/**
 * 创建database
 * @param title
 */
const createDatabase: (title) => Promise<String> = async (title) => {
  return post("/databases", {
    parent: {
      "type": "page_id",
      "page_id": pageId.value,
    },
    title: [{
      type: "text",
      text: {content: title}
    }],
    properties: {
      "商品": {"id": "title", "name": "商品", "type": "title", "title": {}},
      "服务商": {"name": "服务商", "type": "select", "select": {}},
      "收/支": {"name": "收/支", "type": "select", "select": {}},
      "交易对方": {"name": "交易对方", "type": "rich_text", "rich_text": {}},
      "备注": {"name": "备注", "type": "rich_text", "rich_text": {}},
      "金额": {"name": "金额", "type": "number", "number": {"format": "yuan"}},
      "支付方式": {"name": "支付方式", "type": "select", "select": {}},
      "交易类型": {"name": "交易类型", "type": "select", "select": {}},
      "交易日期": {"name": "交易日期","type": "date", "date": {}}}
  })
}

const addRow:(lineArr) => Promise<boolean> = async (lineArr) => {
  let title = getTitle(lineArr[0]);
  let id = databaseMap[title];
  if (!id) {
    //如果不存在database 就创建database
    let reault = await createDatabase(title)
    id = reault.data.id;
    databaseMap[title] = id;
  }
  let properties = {
    "商品": {"title": [{type: "text", "text": {"content": lineArr[3]}}]},
    "交易类型": {"select": {"name": lineArr[1]}},
    "交易对方": {"rich_text": [{"text": {"content": lineArr[2]}}]},
    "收/支": {"select": {"name": lineArr[4]}},
    "金额": {"number": Number.parseFloat(lineArr[5].slice(1))},
    "支付方式": {"select": {"name": lineArr[6]}},
    "备注": {"rich_text": [{"text": {"content": lineArr[10]}}]},
    "交易日期": {"date": {"start": lineArr[0].substring(0, 10)}},
    "服务商": {"select": {"name": "微信"}},
  };
  return post("/pages", {
    parent: {
      database_id: id,
    },
    properties: properties
  })
}

const iaRowData: (text) => boolean = (text) => {
  return /^\d+$/.test(text.substring(0,4));
}

const loadWxCvs: (arr) => void = async (arr) => {
  for (const item of arr) {
    if (iaRowData(item)){
      activities.push({
        content: item,
        timestamp: item.substring(0,19)
      })
    } else {
      console.log(item);
    }
  }
}

const loadAliCvs: (arr) => void = async (arr) => {
  for (const item of arr) {
    const index = arr.indexOf(item);
    if (index > 4 && index < arr.length - 8) {
      console.log(item);
      let lineArr = item.split(",");
      let title = getTitle(lineArr[2]);
      let id = databaseMap[title];
      if (!id) {
        //如果不存在database 就创建database
        let reault = await createDatabase(title)
        id = reault.data.id;
        databaseMap[title] = id;
      }
      let properties = {
        "商品": {"title": [{type: "text", "text": {"content": lineArr[8].trim()}}]},
        "交易类型": {"select": {"name": lineArr[6].trim()}},
        "交易对方": {"rich_text": [{"text": {"content": lineArr[7].trim()}}]},
        "收/支": {"select": {"name": lineArr[10].trim()}},
        "金额": {"number": Number.parseFloat(lineArr[9].trim())},
        // "支付方式": {"select": {"name": lineArr[6]}},
        "备注": {"rich_text": [{"text": {"content": lineArr[10].trim()}}]},
        "交易日期": {"date": {"start": lineArr[2].substring(0, 10)}},
        "服务商": {"select": {"name": "支付宝"}},
      };
      await post("/pages", {
        parent: {
          database_id: id,
        },
        properties: properties
      })
    }
  }
}

const beforUpload: (uploadFile, uploadFiles) => boolean = (uploadFile, uploadFiles) => {
  const reader = new FileReader();
  reader.onload = async () => {
    const loading = ElLoading.service({
      lock: true,
      text: '请求中',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    let text = reader.result;
    // 判断是微信账单还是支付宝账单
    if (text.startsWith("微信")){
           await loadWxCvs(text.split("\n"))
    } else {
           await loadAliCvs(text.split("\n"))
    }
    loading.close()
    // for (const item of arr) {
    //   const index = arr.indexOf(item);
    //   if (index < 17) {
        // instance.post("/databases",{
//     parent: {
//       "type": "page_id",
//       "page_id":"16cc5bde7f154272b8df608eaead1a8d",
//     // database_id: '28daa326e10b4ea6b48723e035a9cb7c',
//   },
//   title: [{
//     type:"text",
//     text: {content: "2022年9月"}
//   }],
//   properties : {
//     "Name": {
//       "id": "title",
//       "name": "Name",
//       "type": "title",
//       "title": {}
//     },
//      "收/支":{"name":"收/支","type":"select","select":{}},
//      "交易对方":{"name":"交易对方","type":"rich_text","rich_text":{}},
//     "备注":{"name":"备注","type":"rich_text","rich_text":{}},
//     "金额":{"name":"金额","type":"number","number":{"format":"yuan"}},
//     "Created by":{"name":"Created by","type":"created_by","created_by":{}},
//     "商品":{"name":"商品","type":"rich_text","rich_text":{}},
//     "Created time":{"name":"Created time","type":"created_time","created_time":{}},
//     "支付方式":{"name":"支付方式","type":"select","select":{}},
//       "交易类型":{"name":"交易类型","type":"select","select":{}}
//         }
// }).then(response=>{
//   console.log(response);
// })
//         console.log(item);
//       } else {
//         let lineArr = item.split(",");
//         let properties = {
//           "交易时间": {
//             "title": [
//               {
//                 type: "text",
//                 "text": {
//                   "content": lineArr[0]
//                 }
//               }
//             ]
//           },
//           "交易类型": {"select": {"name": lineArr[1]}},
//           "交易对方": {"rich_text": [{"text": {"content": lineArr[2]}}]},
//           "商品": {"rich_text": [{"text": {"content": lineArr[3]}}]},
//           "收/支": {"select": {"name": lineArr[4]}},
//           "金额": {"number": Number.parseFloat(lineArr[5].slice(1))},
//           "支付方式": {"select": {"name": lineArr[6]}},
//           "备注": {"rich_text": [{"text": {"content": lineArr[10]}}]},
//         };
//         console.log(properties);
//         let result = await instance.post("/pages", {
//           parent: {
//             database_id: '28daa326e10b4ea6b48723e035a9cb7c',
//           },
//           properties: properties
//         })
//         console.log(result);
        //     .then(function (response) {
        //   console.log(response);
        // }).catch(function (error) {
        //   console.log(error);
        // });
    //   }
    // }
    //convert text to json here
    //var json = this.csvJSON(text);
  };
  reader.readAsText(uploadFile,"GB2312");
  return false;
}
</script>
